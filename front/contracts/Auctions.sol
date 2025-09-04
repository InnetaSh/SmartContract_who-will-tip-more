// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Auctions {
    address public owner;
    
    uint public highestBid;
    address public highestBidder;
    bool public auctionEnded;



    uint totalProposals;

    string[] public proposals;  // массив вариантов
    mapping(uint => mapping(address => uint)) public votes; // кто за что проголосовал votes[proposalIndex][voter] => сколько раз
    mapping(uint => uint) public voteCounts;  //маппинг id варианта - количество голосов (Счётчик голосов)
   

    event NewHighestBid(address bidder, uint amount);
    event ProposalAdded(string proposal);
    event Voted(address voter, uint proposalIndex);
    event AuctionEnded(address winner, uint amount);
    event VotingEnded(uint winningProposalIndex, string proposal);
    event Withdrawn(address to, uint amount);


    constructor() { 
        owner = msg.sender; 
    }


    modifier onlyOwner(){
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    // ====================================
    function bid(uint proposalIndex) external payable {
        require(!auctionEnded, "Auction ended");
        require(msg.value > 0, "No ETH sent");
      
        require(proposalIndex < proposals.length, "Invalid proposal");
        
        require((msg.value) > highestBid, "Bid too low");

        highestBid = msg.value;
        highestBidder = msg.sender;

        votes[proposalIndex][msg.sender]++;
        voteCounts[proposalIndex]++;

        emit Voted(msg.sender, proposalIndex);

        emit NewHighestBid(msg.sender, msg.value);
    }

   


    function addProposal(string calldata _proposal) external onlyOwner {
        require(bytes(_proposal).length > 0, "Proposal cannot be empty");

        for (uint i = 0; i < proposals.length; i++) {
            if (keccak256(bytes(proposals[i])) == keccak256(bytes(_proposal))) {
                revert("Proposal already exists");
            }
        }

        proposals.push(_proposal);
        emit ProposalAdded(_proposal);
    }

   


    function endAuctionAndWithdrawToWinner() external onlyOwner {
        require(!auctionEnded, "Already ended");
        auctionEnded = true;

        
        uint winnerIndex = 0;
        uint maxVotes = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (voteCounts[i] > maxVotes) {
                maxVotes = voteCounts[i];
                winnerIndex = i;
            }
        }

        emit VotingEnded(winnerIndex, proposals[winnerIndex]);

        
        uint bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        (bool sent, ) = payable(owner).call{value: bal}("");
        require(sent, "Withdraw failed");

        emit Withdrawn(owner, bal);
    }



    function getTopProposals(uint256 topN) external view returns (string[] memory topProposals, uint256[] memory topVotes) {
        uint256 proposalsCount = proposals.length;
        if (topN > proposalsCount) {
            topN = proposalsCount;
        }

        uint[] memory indices = new uint[](proposalsCount);
        for (uint i = 0; i < proposalsCount; i++) {
            indices[i] = i;
        }

        
        for (uint i = 0; i < proposalsCount; i++) {
            for (uint j = i + 1; j < proposalsCount; j++) {
                if (voteCounts[indices[j]] > voteCounts[indices[i]]) {
                    uint temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
            }
        }

        
        topProposals = new string[](topN);
        topVotes = new uint256[](topN);

        for (uint i = 0; i < topN; i++) {
            topProposals[i] = proposals[indices[i]];
            topVotes[i] = voteCounts[indices[i]];
        }
    }



    //==============================================
    function getProposals() external view returns (string[] memory) {
        return proposals;
    }

    function getVoteCount(uint index) external view returns (uint) {
        return voteCounts[index];
    }

    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }

     function getHighestBid() external view returns (uint) {
        return highestBid;
    }


}


