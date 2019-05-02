pragma solidity >=0.5.2;


// TODO: get gas refund for userPicks
// The size must now be adjusted within the type before the conversion. For example, you can convert a bytes4 (4 bytes) to a uint64 (8 bytes) by first converting the bytes4 variable to bytes8 and then to uint64. You get the opposite padding when converting through uint3
contract Ultimatum {



    uint public wager = 10**17;      // .1 Ether
    uint8 public lotteryLength = 10;     // Length of lottery in blocks
    uint8 public timeToRespond = 10;   // Time given to make move in blocks


    mapping (address => uint) public owed;       // Amount WEI owed to user

    bytes32 public blockhashresult;
    uint public blockhashnumber;
    uint public randomnumber;

    address public owner;

    struct Game { 
        address proposer;
        address responder; 
        uint256 offer;
        uint256 resultBlock;   // Starting block
        uint256 acceptDeadline;   // block number to accept by
        uint256 money; 
    }

    uint256 public gameNonce = 1;

    mapping (uint256 => Game) public games; 
    
    address[] public committed; 


    constructor()
    public {
        owner = msg.sender;
        startGame(); 
    }


    // @notice When Lottery is live, users can submit picks here
    function play()
    public
    payable {
        require(msg.value == wager, "minimum bet not sent");
        Game storage currentGame = games[gameNonce]; 
        // Has lottery expired?
        if (currentGame.resultBlock <= block.number){
            startGame(); 
        }
        games[gameNonce].money += msg.value; 
        committed.push(msg.sender); 
        // TODO: emit event
    }

    function startGame()
    public {
        Game storage currentGame = games[gameNonce]; 
        require(currentGame.resultBlock <= block.number, "LOTTERY NOT STARTED OR FINISHED");
        // Not enough people waiting? 
        if (committed.length < 2){
            // Extend lottery period
            currentGame.resultBlock = block.number + lotteryLength; 
            // TODO: emit event
        }
        else {
            // Get blockhash of result block
            bytes32 lastNumbers = blockhash(currentGame.resultBlock);
            blockhashresult = lastNumbers; 
            uint256 number = uint256(lastNumbers); 
            blockhashnumber = number;
            uint256 rando = number % committed.length;
            randomnumber = rando; 
            currentGame.proposer = committed[rando];
            rando == 0 ? rando = rando + 1 : rando = rando -1; 
            currentGame.responder = committed[rando]; 
            emit LogNewGame(gameNonce, currentGame.proposer, currentGame.responder); 
            delete committed;
            gameNonce++;     
            games[gameNonce].resultBlock = block.number + lotteryLength; 
        }
    }


    function makeOffer(uint256 nonce, uint256 offer)
    public {
        Game storage thisGame = games[nonce];
        require(thisGame.offer == 0, "OFFER ALREADY MADE"); 
        require(offer > 0 && offer <= thisGame.money, "WRONG OFFER VALUE"); 
        require(msg.sender == thisGame.proposer, "MUST BE PROPOSER"); 
        require(block.number < (thisGame.resultBlock + timeToRespond), "DIDNT MAKE OFFER IN TIME"); 
        thisGame.offer = offer;
        thisGame.acceptDeadline = block.number + timeToRespond;
    }

    function finishGame(uint256 nonce, bool acceptOffer)
    public {
        Game storage thisGame = games[nonce];
        require(thisGame.offer != 0, "OFFER NOT MADE YET"); 
        require(block.number < thisGame.acceptDeadline, "DIDNT RESPOND IN TIME");
        require(msg.sender == thisGame.responder, "MUST BE RESPONDER"); 
        emit LogGameFinished(nonce, acceptOffer);
        if (acceptOffer) { 
            owed[msg.sender] += thisGame.offer; 
            owed[thisGame.proposer] += thisGame.money - thisGame.offer; 
            delete games[nonce]; 
        }
        else { 
            owed[owner] += thisGame.money; 
            delete games[nonce]; 
        }
    }

    function withdraw()
    public { 
        uint payout = owed[msg.sender]; 
        require(payout > 0, "0 OWED"); 
        delete owed[msg.sender]; 
        msg.sender.transfer(payout); 
    }


    // @dev Game can timeout at the offer or the response
    function refundMatch(uint256 nonce)
    public { 
        Game storage thisGame = games[nonce];
        require(thisGame.money != 0); 
        // Proposer didn't respond?
        if (thisGame.offer == 0){
            require(thisGame.resultBlock + timeToRespond < block.number, "STILL HAS TIME TO RESPOND");
            owed[thisGame.responder] += thisGame.money;  
            delete games[nonce]; 
        }
        // Must be the responder
        else {
            require(thisGame.acceptDeadline < block.number, "STILL HAS TIME TO RESPOND"); 
            owed[thisGame.proposer] += thisGame.money; 
            delete games[nonce];
        }
    }

function getGame(uint256 nonce)
    public 
    view 
    returns (address, address, uint256, uint256, uint256, uint256){
        Game storage g = games[nonce];
        return (g.proposer, g.responder, g.offer, g.resultBlock, g.acceptDeadline, g.money); 
    }

    event LogNewGame(uint256 indexed nonce, address proposer, address responder);
    event LogGameFinished(uint256 indexed nonce, bool accepted); 


    /// @dev Converts a numeric string to it's unsigned integer representation.
    /// @param v The string to be converted.
    function bytesToUInt(bytes32 v) 
    public
    pure 
    returns (uint ret) {
        require(v != bytes32(0));
        uint digit;

        for (uint i = 0; i < 32; i++) {
            digit = uint((uint(v) / (2 ** (8 * (31 - i)))) & 0xff);
            if (digit == 0) {
                break;
            }
            else if (digit < 48 || digit > 57) {
                revert("BAD DIGIT");
            }
            ret *= 10;
            ret += (digit - 48);
        }
        return ret;
    }
}