pragma solidity >=0.5.2;

import './SafeMath.sol'; 
// TODO: Create connection deadline. Deposit goes to user who made it further in the game
// TODO: moveTimeline should be measured in blocks


contract Ultimatum { 
    using SafeMath for uint256; 

    address public owner; 
    enum GameState { Uninitialized, FirstMove, SecondMove }
    // ------------------------------------------------------------------------
    //  Boolean storage representing pairing requests and connections
    // ------------------------------------------------------------------------
    mapping (bytes32 => bool) public requested;
    mapping (bytes32 => bool) public connected;
    mapping (bytes32 => uint) public offer; 
    mapping (bytes32 => uint) public deadline; 
    mapping (bytes32 => GameState) public gameState; 



    mapping (address => uint) public owed; 

    uint public moveTimeline = uint(60400);   // One day
    uint public wager = 10**17;      // .1 ether 

    constructor() 
    public { 
        owner = msg.sender; 
    }

    function broadcastPlayer()
    public { 
        emit LogWantingToPlay(msg.sender); 
    }


    // ------------------------------------------------------------------------
    //  Request a pairing with address _to
    // Execution cost: 23965
    // ------------------------------------------------------------------------
    function requestMatch(address _to)
    public 
    payable {
        require(msg.value == wager); 
        bytes32 pairHash = getPairHash(msg.sender, _to);
        require(!connected[pairHash]);
        requested[keccak256(abi.encodePacked(pairHash, msg.sender))] = true;
        deadline[keccak256(abi.encodePacked(pairHash, _to))] = now.add(moveTimeline*10); 
        emit LogGameRequest(_to, msg.sender);
    }

    // ------------------------------------------------------------------------
    //  User can agree to start a match with _from
    // TODO: ecRecover() signature of intent to play. Avoid having to call requestMatch()
    // ------------------------------------------------------------------------
    function firstOfferOffChain(address _from, uint _offer)
    public 
    payable {
        require(msg.value == wager); 
        require(_offer > 0 && _offer < wager); 
        bytes32 pairHash = getPairHash(msg.sender, _from);
        require(requested[keccak256(abi.encodePacked(pairHash, _from))]);
        delete requested[keccak256(abi.encodePacked(pairHash, _from))];
        connected[pairHash] = true;
        deadline[pairHash] = moveTimeline.add(now); 
        bytes32 offerHash = keccak256(abi.encodePacked(pairHash, msg.sender)); 
        offer[offerHash] = _offer; 
        gameState[pairHash] = GameState.FirstMove; 
        emit LogNewGame(pairHash, _from, msg.sender, _offer);
    }

    // ------------------------------------------------------------------------
    //  User can agree to start a match with _from
    // Execution cost: 50588
    // ------------------------------------------------------------------------
    function firstOffer(address _from, uint _offer)
    public 
    payable {
        require(msg.value == wager); 
        require(_offer > 0 && _offer <= wager); 
        bytes32 pairHash = getPairHash(msg.sender, _from);
        require(requested[keccak256(abi.encodePacked(pairHash, _from))]);
        delete requested[keccak256(abi.encodePacked(pairHash, _from))];
        connected[pairHash] = true;
        deadline[pairHash] = moveTimeline.add(now); 
        bytes32 offerHash = keccak256(abi.encodePacked(pairHash, msg.sender)); 
        offer[offerHash] = _offer; 
        gameState[pairHash] = GameState.FirstMove; 
        emit LogNewGame(pairHash, _from, msg.sender, _offer);
    }

    // ------------------------------------------------------------------------
    //  User who initiated game can now accept or deny the offer and create an offer of their own
    // Execution cost: 69873
    // ------------------------------------------------------------------------
    function secondOffer(address _to, uint _responseOffer, bool _accept)
    public { 
        require(_responseOffer > 0 && _responseOffer <= wager);  
        bytes32 pairHash = getPairHash(msg.sender, _to); 
        bytes32 opponentHash = keccak256(abi.encodePacked(pairHash, _to));
        bytes32 playerHash = keccak256(abi.encodePacked(pairHash, msg.sender));
        require(gameState[pairHash] == GameState.FirstMove); 
        require(connected[pairHash]); 
        gameState[pairHash] = GameState.SecondMove; 
        require(offer[opponentHash] > 0);
        uint deal = offer[opponentHash]; 
        delete offer[opponentHash]; 
        if (_accept) { 
            owed[msg.sender] = owed[msg.sender].add(deal); 
            owed[_to] = owed[_to].add(wager.sub(deal)); 
        }
        else owed[owner] = owed[owner].add(wager); 
        offer[playerHash] = _responseOffer; 
        emit LogOfferReturned(pairHash, msg.sender, _responseOffer, _accept, deal); 
    }

    // ------------------------------------------------------------------------
    //  User who accepted game can accept the offer or deny it
    // Execution cost: 12594
    // ------------------------------------------------------------------------
    function finishGame(address _to, bool _accept)
    public {
        bytes32 pairHash = getPairHash(msg.sender, _to);
        require (gameState[pairHash] == GameState.SecondMove); 
        bytes32 opponentHash = keccak256(abi.encodePacked(pairHash, _to));    // Offer for address _to
        require(connected[pairHash]);
        delete connected[pairHash];
        uint deal = offer[opponentHash]; 
        delete offer[opponentHash]; 
        delete gameState[pairHash]; 
        if (_accept) { 
            owed[msg.sender] = owed[msg.sender].add(deal); 
            owed[_to] = owed[_to].add(wager.sub(deal)); 
        }
        else { 
            owed[owner] = owed[owner].add(wager); 
        }
        emit LogGameFinished(pairHash, msg.sender, _accept, deal); 
    }


    function withdraw()
    public { 
        uint payout = owed[msg.sender]; 
        require(payout > 0, "0 OWED"); 
        delete owed[msg.sender]; 
        msg.sender.transfer(payout); 
    }


    // @dev Game can end at 4 places: requestMatch(), firstOffer(), secondOffer(), finishGame
    function refundMatch(address _otherPlayer)
    public 
    returns (bool) { 
        bytes32 pairHash = getPairHash(msg.sender, _otherPlayer); 
        bytes32 otherPlayerHash = getVariableHashFor(pairHash, _otherPlayer);
        bytes32 thisPlayerHash = getVariableHashFor(pairHash, msg.sender); 
        // after requestMatch() 
        if (requested[otherPlayerHash]) { 
            require(!connected[pairHash]);
            require(deadline[pairHash] < now);   // Make sure other players deadline is up
            delete requested[otherPlayerHash]; 
            credit(msg.sender, wager);     // Return users wager 
            return true; 
        }
        // after firstOffer or second offer 
        if (gameState[pairHash] == GameState.FirstMove || gameState[pairHash] == GameState.SecondMove){
            require(deadline[pairHash] < now); 
            if (offer[otherPlayerHash] == 0){
                credit(msg.sender, wager); 
                finishGame(pairHash, thisPlayerHash); 
                return true;
            }
            else {
                credit(_otherPlayer, wager); 
                finishGame(pairHash, otherPlayerHash);
                return true;
            }
        }
        return false;
    }

    function finishGame(bytes32 pairHash, bytes32 playerHash)
    internal {
        delete connected[pairHash];
        delete offer[playerHash];
        delete gameState[pairHash];
    }

    function credit(address _a, uint _amount)
    internal 
    returns (bool) { 
        owed[_a] = owed[_a].add(_amount); 
        return true; 
    }

    // ------------------------------------------------------------------------
    // @notice Finds the common shared hash of these two addresses
    // @dev Use this to store shared game data between two addresses
    // ------------------------------------------------------------------------
    function getPairHash(address _a, address _b)
    public
    pure
    returns (bytes32){
        return (_a < _b) ? keccak256(abi.encodePacked(_a, _b)) :  keccak256(abi.encodePacked(_b, _a));
    }

    // ------------------------------------------------------------------------
    // @notice returns the request hash corresponding to _pairHash and address _b 
    // @dev Variables corresponding to address _b in pairHash(_a, _b)
    // ------------------------------------------------------------------------
    function getVariableHashFor(bytes32 _pairHash, address _user)
    public
    pure
    returns (bytes32){
        return keccak256(abi.encodePacked(_pairHash, _user));
    }



    // ------------------------------------------------------------------------
    //  Events
    // ------------------------------------------------------------------------
    event LogWantingToPlay(address indexed _sender); 
    event LogNewGame(bytes32 indexed pairHash, address indexed initiator, address indexed acceptor, uint firstOffer);
    event LogOfferReturned(bytes32 indexed id, address player, uint returnOffer, bool accepted, uint amountAccepted); 
    event LogGameFinished(bytes32 indexed id, address player, bool accepted, uint amountAccepted); 
    event LogGameRequest(address indexed _to, address indexed _initiator); 

}

