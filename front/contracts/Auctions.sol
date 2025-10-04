// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Auctions {
    using Strings for uint;
    address public owner;

    //===================PART1===========================

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




    //===================PART2===========================
    uint minDonation;
    uint maxDonation;
    uint goalAmount; 
    uint totalAmount;

    bool public useToken; // true — использовать ERC20, false — использовать ETH
    address tokenAddress = 0x0000000000000000000000000000000000000000; 

    IERC20 public token; // адрес токена (если используем токен)
    bool public goalReached;

    
    struct Tip {
        address from;
        uint256 amount;
        string tag;
        uint256 timestamp;
    }

    Tip[] public tips;

    mapping(address => uint256) balances;

    event Tipped(address indexed from, uint amount, string tag);
    event GoalReached(uint total);
    event Refunded(address indexed to, uint amount);

    //===================ALL===========================
   constructor(
        uint _minDonation,
        uint _maxDonation
    ) {
        owner = msg.sender;
        minDonation = _minDonation;
        maxDonation = _maxDonation;
    }


    modifier onlyOwner(){
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }



    //===================PART1 FUNCTION===========================
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

   


    function endAuction() external onlyOwner {
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

    }

    function withdraw() external onlyOwner  {
         require(auctionEnded, "Cooldown: withdraw too soon");

        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        (bool ok,) = payable(owner).call{value: bal}("");
        require(ok, "Withdraw failed");

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

    function getAuctionEnded() external view returns (bool) {
        return auctionEnded;
    }


   //===================PART2 FUNCTION===========================

    function SetToken(bool _token) public{
        useToken = _token;
        if (useToken) {
            require(tokenAddress != address(0), "Token address required");
            token = IERC20(tokenAddress);
        }
    }




    function setGoalAmount(uint _goalAmount) external onlyOwner {
        goalAmount = _goalAmount;
    }

    function setTokenAddress(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        tokenAddress = _tokenAddress;
    }

    function tip(string calldata tag) external payable{
        uint256 amount;
    
  
        if (useToken) {
            amount = token.allowance(msg.sender, address(this));
            require(amount >= minDonation && amount <= maxDonation, string(abi.encodePacked("Tip must be between ", minDonation.toString(), " and ", maxDonation.toString())));
            require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        } else {
            amount = msg.value;
            require(amount >= minDonation && amount <= maxDonation, string(abi.encodePacked("Tip must be between ", minDonation.toString(), " and ", maxDonation.toString())));
        }

        balances[msg.sender] += amount;
            
        tips.push(Tip({
            from: msg.sender,
            amount: amount,
            tag: tag,
            timestamp: block.timestamp
        }));

        totalAmount += amount;

         emit Tipped(msg.sender, amount, tag);

        if (!goalReached && totalAmount >= goalAmount) {
            goalReached = true;
            emit GoalReached(totalAmount);
        }
    }

    function refund() external {
       
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No contributions");

        balances[msg.sender] = 0;
        totalAmount -= amount;
        
        if (useToken) {
            require(token.transfer(msg.sender, amount), "Token refund failed");
        } else {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "ETH refund failed");
        }

        emit Refunded(msg.sender, amount);
    }

     function getTipsCount() external view returns (uint) {
        return tips.length;
    }

    
    function getTip(uint index) external view returns (Tip memory) {
        require(index < tips.length, "Index out of range");
        return tips[index];
    }

    function getGoalAmount() external view returns (uint) {
        return goalAmount;
    }

    function getTotalAmount() external view returns (uint) {
        return totalAmount;
    }

    function getMinDonation() external view returns (uint) {
        return minDonation;
    }
    
    function getMaxDonation() external view returns (uint) {
        return maxDonation;
    }
    
     function getTokenAddress() external view returns (address) {
        return tokenAddress;
    }
    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }
}



