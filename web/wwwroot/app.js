(async function () {
    const statusEl = document.getElementById('status');
    const connectBtn = document.getElementById('connectBtn');
    const voteBtn = document.getElementById('voteBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const showTopProposalSection = document.getElementById('showTopProposalSection');
    const closeTopProposalSection = document.getElementById('closeTopProposalSection');


    const showAddProposalSection = document.getElementById('showAddProposalSection');
    const closeAddProposal = document.getElementById('closeAddProposal');
    const addProposalDiv = document.getElementById('AddProposal');
    const addProposalBtn = document.getElementById('addProposalBtn');

    const topProposalsDiv = document.getElementById('TopProposal');

    const amountEl = document.getElementById('amount');
    const amountError = document.getElementById('amountError');
    const contractAddrEl = document.getElementById('contractAddr');
    const balanceEl = document.getElementById('balance');
    const tipsList = document.getElementById('tipsList');
    

    let provider, signer, contract, cfg;
    let isConnecting = false;

    function log(msg) { statusEl.textContent = 'Status: ' + msg; }

    async function loadConfig() {
        const res = await fetch('contractConfig.json');
        if (!res.ok) { log('contractConfig.json not found. Deploy the contract first.'); return; }
        cfg = await res.json();
        contractAddrEl.textContent = cfg.address;
    }

    async function connect() {
        if (isConnecting) return;
        isConnecting = true;

        try {
            if (!window.ethereum) {
                alert("Please install MetaMask!");
                return;
            }

            provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            contract = new ethers.Contract(cfg.address, cfg.abi, signer);

            const addr = await signer.getAddress();
            log(`Подключено к контракту: ${addr}`);
            await refreshBalance();
       

            await loadProposals();
            subscribeEvents();
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            isConnecting = false;
        }
    }

    async function refreshBalance() {
        try {
            console.log("Getting balance for", cfg.address);
            const bal = await provider.getBalance(cfg.address);
            console.log("Balance (wei):", bal.toString());
            balanceEl.textContent = ethers.formatEther(bal);
        } catch (e) {
            console.error("Error in refreshBalance:", e);
            log("Error refreshing balance: " + e.message);
        }
    }

    async function sendTip() {
        const eth = amountEl.value.trim();
        if (!eth || Number(eth) <= 0) { log('Enter amount > 0'); return; }
        const tx = await contract.bid({ value: ethers.parseEther(eth) });
        log('Sending tx: ' + tx.hash);
        await tx.wait();
        log('Tip sent ');
        
        await refreshBalance();
    }

    function renderTip(tip) {
        const li = document.createElement('li');
        const ts = new Date(Number(tip.timestamp) * 1000).toLocaleString();
        li.textContent = `${ts} — ${tip.from} tipped ${ethers.formatEther(tip.amount)} ETH: ${tip.message}`;
        tipsList.prepend(li);
    }

    async function loadTips() {
        tipsList.innerHTML = '';
        try {
            const filter = contract.filters.NewHighestBid();
            const latestBlock = await provider.getBlockNumber(); 
            const events = await contract.queryFilter(filter, 0, latestBlock);
            for (const ev of events) {
                const { from, amount, message, timestamp } = ev.args;
                renderTip({ from, amount, message, timestamp });
            }
        } catch (e) {
            console.error(e);
            log('Failed to load past tips (check provider/network).');
        }
    }
    function subscribeEvents() {
        if (!contract) {
            console.error("Contract is not initialized");
            return;
        }

        // Новый высший бид (аукцион)
        contract.on("NewHighestBid", (bidder, amount) => {
            console.log("💰 Новый бид:", bidder, ethers.utils.formatEther(amount));
            alert(`Новый высший бид от ${bidder}, сумма: ${ethers.utils.formatEther(amount)} ETH`);
        });

        // Добавлено новое предложение
        contract.on("ProposalAdded", (proposal) => {
            console.log("📝 Добавлено предложение:", proposal);
            alert(`Добавлено новое предложение: ${proposal}`);
            loadProposals(); // обновим список
        });

        // Кто-то проголосовал
        contract.on("Voted", (voter, proposalIndex) => {
            console.log("🗳 Проголосовал:", voter, "за индекс:", proposalIndex);
            alert(`Пользователь ${voter} проголосовал за предложение #${proposalIndex}`);
        });

        // Аукцион завершён
        contract.on("AuctionEnded", (winner, amount) => {
            console.log("🏁 Аукцион завершён. Победитель:", winner, "Сумма:", ethers.utils.formatEther(amount));
            alert(`Аукцион завершён. Победитель: ${winner}, сумма: ${ethers.utils.formatEther(amount)} ETH`);
        });

        // Голосование завершено
        contract.on("VotingEnded", (winningProposalIndex, proposal) => {
            console.log("🎉 Голосование завершено. Победило:", proposal, `(индекс ${winningProposalIndex})`);
            alert(`Голосование завершено. Победитель: ${proposal}`);
        });

        // Вывод средств
        contract.on("Withdrawn", (to, amount) => {
            console.log("💸 Средства выведены на:", to, "Сумма:", ethers.utils.formatEther(amount));
            alert(`Выведено ${ethers.utils.formatEther(amount)} ETH на адрес ${to}`);
        });

        console.log("📡 Подписка на события завершена");
    }


    async function withdraw() {
        try {
            const tx = await contract.withdraw();
            log('Withdrawing: ' + tx.hash);
            await tx.wait();
            await refreshBalance();
            log('Withdraw complete ');
        } catch (e) {
            log('Withdraw failed: ' + (e?.reason || e.message));
        }
    }




    async function loadProposals() {
        const select = document.getElementById('id_proposal');
        const proposals = await contract.getProposals(); 

        select.innerHTML = '<option value="">Выберите предложение</option>';

        for (let i = 0; i < proposals.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = proposals[i]; 
            select.appendChild(option);
        }
    }
    async function votedProposal() {
        const eth = amountEl.value.trim();
        if (!eth || Number(eth) <= 0) {
            log('Введите сумму больше 0');
            return;
        }

        const select = document.getElementById('id_proposal');
        const selectedValue = select.value;
        if (selectedValue === "") {
            log("Выберите вариант для голосования.");
            return;
        }

        const selectedIndex = Number(selectedValue);

        try {
            const tx = await contract.bid(selectedIndex, {
                value: ethers.parseEther(eth)
            });

            log('Tx отправлена: ' + tx.hash);
            await tx.wait();
            log(`Голос отправлен. Tx hash: ${tx.hash}`);

            await refreshBalance();
            log("Голосование завершено успешно.");
        } catch (error) {
            //const sum = contract.getHighestBid();
           // amountError.textContent = `Недостаточная сумма для голосования. Введите больше чем ${min} ETH`;
            console.error(error);
            log("Ошибка при голосовании: " + (error?.reason || error.message));
        }
    }



    async function addProposal() {
        try {
            const item = document.getElementById("item").value;
          
            const tx = await contract.addProposal(item);
            await tx.wait();
            alert("Proposal add!");
        } catch (e) {
            alert("Error: " + e.message);
        }
        await loadProposals();
    }


    async function TopProposals() {
        try {
            const listElement = document.getElementById("listItem");
            const [topProposals, topVotes] = await contract.getTopProposals(3);

          
            listElement.innerHTML = "";
            if (topProposals.length === 0) {
                listElement.innerHTML = "<li>No pending items</li>";
            } else {
                for (let i = 0; i < topProposals.length; i++) {
                    console.log(`${topProposals[i]} — ${topVotes[i]} голосов`);
                    const li = document.createElement("li");
                    li.textContent = `${topProposals[i]} — ${topVotes[i]} голосов`;
                    listElement.appendChild(li);
                };
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
    async function showTopProposals() {
        topProposalsDiv.classList.remove('non-display');
        await TopProposals();
    }

   

   // connectBtn.addEventListener('click', connect);
    withdrawBtn.addEventListener('click', withdraw);
    voteBtn.addEventListener('click', votedProposal);

    addProposalBtn.addEventListener('click', addProposal);
    showTopProposalSection.addEventListener('click', showTopProposals);



    showAddProposalSection.addEventListener('click', function () {
        addProposalDiv.classList.remove('non-display');
    });

  
    closeAddProposal.addEventListener('click', function () {
        addProposalDiv.classList.add('non-display');
    });

    closeTopProposalSection.addEventListener('click', function () {
        topProposalsDiv.classList.add('non-display');
    });

    
    amountEl.addEventListener('input', async () => {
        const value = amountEl.value.trim();
        
        if (!value || Number(value) <= 0) {
            amountError.textContent = '';
            return;
        }

        try {
            const highestBid = await contract.getHighestBid();
            const enteredAmount = ethers.parseEther(value);

            if (enteredAmount <= highestBid) {
                const minEth = ethers.formatEther(highestBid);
                amountError.textContent = `Ставка слишком низкая. Введите больше чем ${minEth} ETH`;
            } else {
                amountError.textContent = ''; 
            }
        } catch (err) {
            console.error("Ошибка при получении highestBid:", err);
            amountError.textContent = 'Ошибка проверки минимальной ставки.';
        }
    });



    window.onload = connect;
    await loadConfig();
})();
