(async function () {

   

    const statusEl = document.getElementById('status');
    const connectBtn = document.getElementById('connectBtn');
    const voteBtn = document.getElementById('voteBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');


    const endVotingAndWithdrawToWinner = document.getElementById('endVotingAndWithdrawToWinner');  
    const showTopProposalSection = document.getElementById('showTopProposalSection');
    const addProposalBtn = document.getElementById('addProposalBtn');

    const topProposalsDiv = document.getElementById('TopProposal');

    const amountEl = document.getElementById('amount');
    const amountError = document.getElementById('amountError');
    const contractAddrEl = document.getElementById('contractAddr');
    const balanceEl = document.getElementById('balance');
    const tipsList = document.getElementById('tipsList');


    const GoalAmound = document.getElementById('GoalAmound');
    const TotalAmound = document.getElementById('TotalAmound');
    const proGoalInput = document.getElementById('proGoalInput');
    const setProGoalBtn = document.getElementById('setProGoalBtn');
    const proGoalError = document.getElementById('proGoalError');
    const amountError2 = document.getElementById('amountError-task2');
    const tokenAddress = document.getElementById('tokenAddress');
    const setTokenAddressBtn = document.getElementById('setTokenAddressBtn');



    let provider, signer, contract, cfg;
    let isConnecting = false;

    function log(msg) { statusEl.textContent = 'Status: ' + msg; }

    withdrawBtn.addEventListener('click', withdraw);
    voteBtn.addEventListener('click', votedProposal);

    addProposalBtn.addEventListener('click', addProposal);
    showTopProposalSection.addEventListener('click', showTopProposals);
    endVotingAndWithdrawToWinner.addEventListener('click', endVotingAndWithdraw);


    const id_token = document.getElementById('id_token');
    const chooseTokenTask2 = document.getElementById('choose-token-task2');
    const sentTipBtn = document.getElementById('sent-tip');
    const refundTipBtn = document.getElementById('refund-tip');
    const amountEl2 = document.getElementById('amount-task2');
    const idTag = document.getElementById('id_tag');


    setProGoalBtn.addEventListener('click', setProGoal);
    chooseTokenTask2.addEventListener('click', chooseToken);
    sentTipBtn.addEventListener('click', sendTip);
    refundTipBtn.addEventListener('click', refundTip);
    setTokenAddressBtn.addEventListener('click', setTokenAddress);


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
            await refreshProgress();
           
            await refreshProgress();
            subscribeEvents();

            await loadStateFromContract();
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
            const sum = contract.getHighestBid();
            amountError.textContent = `Недостаточная сумма для голосования. Введите больше чем ${min} ETH`;
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

    async function endVotingAndWithdraw() {
        try {
            if (endVotingAndWithdrawToWinner.textContent === "Stop") {
                await contract.endAuction(); 
                endVotingAndWithdrawToWinner.textContent = "Withdraw"; 
                voteBtn.classList.add('non-display');
                amountError.textContent = 'Голосование окончено!';
            } else if (endVotingAndWithdrawToWinner.textContent === "Withdraw") {
                await contract.withdraw(); 
                endVotingAndWithdrawToWinner.classList.add('non-display'); 
            }
        } catch (err) {
            console.error("Ошибка при вызове функции контракта:", err);
            alert("Что-то пошло не так. Проверь консоль.");
        }

    }


    async function loadStateFromContract() {
        const ended = await contract.getAuctionEnded();
        if (ended) {
            endVotingAndWithdrawToWinner.textContent = "Withdraw";
            voteBtn.classList.add('non-display');
            amountError.textContent = 'Голосование окончено!';
        }
        else {
            endVotingAndWithdrawToWinner.textContent = "Stop";
            const bal = await provider.getBalance(cfg.address);
        }
    }




    
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


    //======================================================
    let goalEth = 0;
    let totalEth = 0;

    let goal = 0;
    let total = 0;

   

    async function refreshProgress() {
        if (!contract) {
            console.warn("Contract is undefined in refreshProgress");
            return;
        }

        try {
             goal = await contract.getGoalAmount();
             total = await contract.getTotalAmount();

            GoalAmound.textContent = 'Goal: ' + ethers.formatEther(goal) + ' ETH';
            TotalAmound.textContent = 'Amound: ' + ethers.formatEther(total) + ' ETH';

            const goalEth = parseFloat(ethers.formatEther(goal));
            const totalEth = parseFloat(ethers.formatEther(total));

            const percent = goalEth > 0 ? Math.min((totalEth / goalEth) * 100, 100) : 0;

            document.getElementById('progressText').textContent = `${totalEth.toFixed(4)} / ${goalEth.toFixed(4)} ETH`;
            document.getElementById('progressFill').style.width = percent + '%';
        } catch (err) {
            console.error("Ошибка при обновлении прогресса:", err);
            alert("Ошибка при получении данных с контракта");
        }
    }
    async function setProGoal() {
        await connect();

        const input = proGoalInput.value;

        if (!input || Number(input) <= 0) {
            proGoalError.textContent = 'Goal must be > 0';
            return;
        }

        try {
            const amount = ethers.parseEther(input);

          
            const signer = await provider.getSigner();
            const tx = await contract.connect(signer).setGoalAmount(amount);

          
            await tx.wait();

            await refreshProgress();
        } catch (err) {
            console.error("Ошибка при установке цели:", err);
            alert("Ошибка при установке цели");
        }
    }



    async function chooseToken() {
        const token = id_token.value;
        const isToken = token === "1";

        if (isToken) {
            const tokenAddr = await contract.getTokenAddress();
            if (tokenAddr === "0x0000000000000000000000000000000000000000") {
                alert("❌ Установи адрес токена перед включением");
                tokenAddress.classList.remove('non-display');
                setTokenAddressBtn.classList.remove('non-display');
                return;
            }
        }
        await contract.SetToken(isToken);
        alert(isToken ? " Token mode activated" : " ETH mode activated");
    }

    async function setTokenAddress() {
        let tokenAddr = tokenAddress.value.trim();
        await contract.setTokenAddress(tokenAddr);
    }


  

    async function sendTip() {
       
        amountError2.textContent = '';
        const eth = amountEl2.value.trim();
        if (!eth || Number(eth) <= 0) { log('Enter amount > 0'); return; }

        const amount = ethers.parseEther(eth);
        console.log(`amount ${amount}`)
        let minDonation = await contract.getMinDonation();
        console.log(`minDonation ${minDonation}`)
        let maxDonation = await contract.getMaxDonation();
        console.log(`maxDonation ${maxDonation}`)
        if (amount < minDonation) {

            amountError2.textContent = `Enter amount ≥ ${ethers.formatEther(minDonation)} ETH`;
            return;
        }

        if (amount > maxDonation) {
            amountError2.textContent = `Enter amount ≤ ${ethers.formatEther(maxDonation)} ETH`;
            return;
        }

        const tagText = idTag.options[idTag.selectedIndex].text;


        const selectedTokenValue = id_token.value; // "0" = ETH, "1" = COIN
        const useToken = selectedTokenValue === "1";

        if (useToken) {

            const tokenAddress = await contract.getTokenAddress(); 
            const tokenAbi = ["function approve(address spender, uint amount) public returns (bool)"];
            const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, contract.signer);

           
            const approveTx = await tokenContract.approve(contract.target, amount);
            console.log("✅ Approve отправлен:", approveTx.hash);
            await approveTx.wait();
            console.log("✅ Approve подтверждён");

            
            const tx = await contract.tip(tagText);
            console.log("💸 Tip отправлен:", tx.hash);
            await tx.wait();
            console.log("✅ Tip успешен!");

            alert("Tip sent with token!");
        } else {
           
            const tx = await contract.tip(tagText, { value: amount });
            console.log("💸 Tip отправлен (ETH):", tx.hash);
            await tx.wait();
            console.log("✅ Tip успешен!");

            alert("Tip sent with ETH!");
        }

        await refreshBalance();
        await refreshProgress();
    }

    async function refundTip() {

        try {
            await connect();
            if (typeof signer === "undefined" || !signer) {
                console.log("Signer не инициализирован. Сначала подключитесь к MetaMask.");
                return;
            }
            if (!signer || !contract) {
                console.log("Сначала подключитесь к кошельку!");
                return;
            }
            const userAddress = await signer.getAddress();
            const balance = await contract.getBalance(userAddress);

           
            console.log("Мой баланс для возврата:", ethers.formatEther(balance));

            if (balance == 0) {
                alert("У вас нет средств для возврата.");
                return;
            }


            const tx = await contract.refund();
            console.log("Транзакция отправлена:", tx.hash);

            const receipt = await tx.wait();
            console.log("Возврат выполнен! Hash:", receipt.transactionHash);

            const total = await contract.getTotalAmount();
           

            let newTotalEth = parseFloat(ethers.formatEther(total));
            document.getElementById('progressText').textContent = `${newTotalEth.toFixed(4)} / ${goalEth.toFixed(4)} ETH`;

            alert("Возврат средств прошёл успешно!");
        } catch (err) {
            console.error("Ошибка при возврате:", err);

            const errorMsg = err?.data?.message || err?.message || "Неизвестная ошибка";
            alert("Ошибка при возврате: " + errorMsg);
        }
        await refreshProgress();
    }



    window.addEventListener("load", async () => {
        try {
            await loadConfig();       
            await connect();           
            await refreshProgress();   
        } catch (err) {
            console.error("Ошибка инициализации:", err);
            alert("Ошибка инициализации: " + err.message);
        }
    });

})();
