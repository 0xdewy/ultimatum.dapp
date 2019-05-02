
const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');

const Ultimatum = artifacts.require("./Ultimatum.sol");


contract('Ultimatum', function (accounts) {

    let ultimatum;    // contract instance 


    const playerA = accounts[1];
    const playerB = accounts[2];
    const playerC = accounts[3];
    const playerD = accounts[4];
    const playerE = accounts[5];

    let players = [playerA, playerB, playerC, playerD, playerE]
    let gameO = {
        proposer: '',
        responder: '',
        offer: 0,
        resultBlock: 0,
        currentBlock: 0,
        acceptDeadline: 0,
        pot: 0,
        nonce: 0
    };

    let wager;
    let numGames;

    getOwed = async (player) => {
        return Number(await ultimatum.owed(player));
    }

    printOwed = async (owner, player1, player2) => {
        console.log("PLAYER ONE OWED ", await getOwed(player1));
        console.log("PLAYER 2 OWED ", await getOwed(player2));
        console.log("OWNER OWED ", await getOwed(owner));
    }

    // getCurrentGame = async () => {
    //     let game = await ultimatum.getGame(numGames);
    // }

    getGameData = async (game) => {
        gameO.proposer = game[0];
        gameO.responder = game[1];
        gameO.offer = Number(game[2]);
        gameO.resultBlock = Number(game[3]);
        gameO.currentBlock = await currentBlockNumber();
        gameO.acceptDeadline = Number(game[4])
        gameO.pot = game[5];
        // console.log("PROPOSER IS ", game[0]);
        // console.log("RESPONDER IS ", game[1]);
        // console.log("OFFER IS ", Number(game[2]));
        // console.log("RESULT BLOCK IS ", Number(game[3]));
        // console.log("CURRENT BLOCK ", gameO.currentBlock);
        // console.log("ACCEPT DEADLINE IS ", Number(game[4]))
        // console.log("MONEY TO WIN IS ", Number(game[5]));
    }

    currentBlockNumber = async () => {
        let block = await web3.eth.getBlock('latest');
        return block.number;
    }



    advanceTime = (time) => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [time],
                id: new Date().getTime()
            }, (err, result) => {
                if (err) { return reject(err); }
                return resolve(result);
            });
        });
    }

    advanceBlock = () => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_mine",
                id: new Date().getTime()
            }, (err, result) => {
                if (err) { return reject(err); }
                const newBlockHash = web3.eth.getBlock('latest').hash;

                return resolve(newBlockHash)
            });
        });
    }

    function eq(a, b) {
        assert.equal(web3.utils.soliditySha3(a) == web3.utils.soliditySha3(b), true)
        return true
    }

    function notEq(a, b) {
        assert.notEqual(web3.utils.soliditySha3(a) == web3.utils.soliditySha3(b), true)
        return true
    }

    it('deploy the contract', async () => {
        ultimatum = await Ultimatum.new();
        wager = await ultimatum.wager();
        console.log("WAGER ", Number(wager));
    });

    it('player1 wants to play', async () => {
        await ultimatum.play({ from: playerA, value: wager });
        gameO.nonce = await ultimatum.gameNonce();
        eq(gameO.nonce, 1);
        eq(await ultimatum.committed(0), playerA);
        await getGameData(await ultimatum.getGame(1));
    });

    it('player2 joins the party', async () => {
        await ultimatum.play({ from: playerB, value: wager });
        eq(await ultimatum.gameNonce(), 1);
        eq(await ultimatum.committed(1), playerB);
        await getGameData(await ultimatum.getGame(1));
    })

    it('player3 joins the party', async () => {
        await ultimatum.play({ from: playerC, value: wager });
        eq(await ultimatum.gameNonce(), 1);
        eq(await ultimatum.committed(2), playerC);
        await getGameData(await ultimatum.getGame(1));
    })

    it('player4 joins the party', async () => {
        await ultimatum.play({ from: playerD, value: wager });
        eq(await ultimatum.gameNonce(), 1);
        eq(await ultimatum.committed(3), playerD);
        await getGameData(await ultimatum.getGame(1));
    })

    it('start game', async () => {
        console.log("PLAYERS ", players);
        // console.log("GAME ", gameO);
        let blocksToMove = gameO.resultBlock - await currentBlockNumber();
        if (blocksToMove >= 0) {
            for (let i = 0; i <= blocksToMove; i++) {
                advanceBlock(); 
                // console.log("ADVANCE BLOCK ", await currentBlockNumber());
            }
        }
        await ultimatum.startGame();
        // console.log("BLOCK HASH RESULT ", await ultimatum.blockhashresult());
        // console.log("Block hash number ", await ultimatum.blockhashnumber());
        console.log("Random number ", Number(await ultimatum.randomnumber()));
        eq(await ultimatum.gameNonce(), 2);
        // notEq(await ultimatum.committed(0), playerA); 
        await getGameData(await ultimatum.getGame(1));
    })

    it('proposer make 50/50 offer', async () => { 
        let offer =  new BN(gameO.pot);
        offer = offer.div(new BN('2'));
        // console.log("WAGER ", wager.mul('2'));

        await ultimatum.makeOffer(gameO.nonce, offer, {from: gameO.proposer});
        await getGameData(await ultimatum.getGame(gameO.nonce));
        eq(gameO.offer, offer)
    })

    it("accepts offer", async () => { 
        await ultimatum.finishGame(gameO.nonce, true, {from: gameO.responder}); 
        await getGameData(await ultimatum.getGame(gameO.nonce));
        eq(await ultimatum.owed(gameO.proposer), gameO.offer), 
        eq(await ultimatum.owed(gameO.responder), gameO.offer); 
    })

})
