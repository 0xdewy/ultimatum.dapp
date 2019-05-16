pragma solidity >=0.5.2;



contract Ultimatum {



    uint public wager = 10**16;      // .1 Ether
    uint8 public lotteryLength = 25;     // Length of lottery in blocks
    uint8 public timeToRespond = 8;   // Time given to make move in blocks


    mapping (address => uint) public owed;       // Amount WEI owed to user

    bytes32 public blockhashresult;     // TODO: testing
    uint public blockhashnumber;    // TODO: testing
    uint public randomnumber;   // TODO: testing

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
        if (currentGame.resultBlock < block.number){
            startGame();
        }
        games[gameNonce].money += msg.value;
        committed.push(msg.sender);
        emit LogJoinedLottery(msg.sender, gameNonce, games[gameNonce].resultBlock);
    }

    function startGame()
    public {
        Game storage currentGame = games[gameNonce];
        require(currentGame.resultBlock < block.number, "LOTTERY NOT FINISHED");
        // Not enough people waiting?
        if (committed.length < 2){
            // Extend lottery period
            currentGame.resultBlock = block.number + lotteryLength;
        }
        else {
            // Get blockhash of result block
            bytes32 lastNumbers = blockhash(currentGame.resultBlock);
            blockhashresult = lastNumbers;  // for testing
            uint256 number = uint256(lastNumbers);
            blockhashnumber = number;   // for testing
            uint256 rando = number % committed.length;
            randomnumber = rando;   // for testing
            currentGame.proposer = committed[rando];
            rando == 0 ? rando = rando + 1 : rando = rando - 1;
            currentGame.responder = committed[rando];
            emit LogNewGame(gameNonce, currentGame.proposer, currentGame.responder);
            delete committed;      // remove participants from lottery
            gameNonce++;    // increase game nonce
            games[gameNonce].resultBlock = block.number + lotteryLength;    // start new lottery for next game
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
        emit LogOfferMade(nonce, offer);
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
        require(thisGame.money != 0, "MATCH FINISHED OR DOESNT EXIST");
        emit LogMatchRefund(nonce, (thisGame.offer == 0));
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

    function getCommitted()
    public
    view
    returns (address[] memory){
        return committed;
    }

    event LogMatchRefund(uint256 indexed nonce, bool proposerFault);
    event LogOfferMade(uint256 indexed nonce, uint256 offer);
    event LogJoinedLottery(address indexed user, uint256 nonce, uint256 resultBlock);
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