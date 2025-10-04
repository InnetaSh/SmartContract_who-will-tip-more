(async function () {

    const showSetProGoalSection = document.getElementById('showSetProGoalSection');
    const closeSetProGoalSection = document.getElementById('closeSetProGoalSection');
    const setProGoalSection = document.getElementById('setProGoalSection');


    const showTask1SegmentBtn = document.getElementById('showTask1SegmentBtn');
    const closeTask1SegmentBtn = document.getElementById('closeTask1SegmentBtn');
    const task1Div = document.getElementById('task1');

    const showTask2SegmentBtn = document.getElementById('showTask2SegmentBtn');
    const closeTask2SegmentBtn = document.getElementById('closeTask2SegmentBtn');
    const task1Div2 = document.getElementById('task2');

    const showAddProposalSection = document.getElementById('showAddProposalSection');
    const closeAddProposal = document.getElementById('closeAddProposal');
    const addProposalDiv = document.getElementById('AddProposal');


    const closeTopProposalSection = document.getElementById('closeTopProposalSection');
    const topProposalsDiv = document.getElementById('TopProposal');
    showSetProGoalSection.addEventListener('click', function () {
        setProGoalSection.classList.remove('non-display')
    });

    closeSetProGoalSection.addEventListener('click', function () {
        setProGoalSection.classList.add('non-display')
    });


    showTask1SegmentBtn.addEventListener('click', function () {
        task1Div.classList.remove('non-display')
    });
    closeTask1SegmentBtn.addEventListener('click', function () {
        task1Div.classList.add('non-display')
    });

    showTask2SegmentBtn.addEventListener('click', function () {
        task1Div2.classList.remove('non-display')
    });
    closeTask2SegmentBtn.addEventListener('click', function () {
        task1Div2.classList.add('non-display')
    });



    showAddProposalSection.addEventListener('click', function () {
        addProposalDiv.classList.remove('non-display');
    });


    closeAddProposal.addEventListener('click', function () {
        addProposalDiv.classList.add('non-display');
    });

    closeTopProposalSection.addEventListener('click', function () {
        topProposalsDiv.classList.add('non-display');
    });




})();