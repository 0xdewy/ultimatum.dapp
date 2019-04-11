var bn = require('bignumber.js');

const Ultimatum = artifacts.require("./Ultimatum.sol");


contract('Ultimatum', function (accounts) {

    let ultimatum;    // contract instance 

    const player1 = accounts[5];
    const player2 = accounts[1];
    const player3 = accounts[2];
    const player4 = accounts[3];
    const player5 = accounts[4];

    let match1 = {
        pairHash: '',
        player1: '',
        player2: ''
    }
    let wager;

    getOwed = async (player) => {
        return Number(await ultimatum.owed(player)); 
    }

    printOwed = async (owner, player1, player2) => {
        console.log("PLAYER ONE OWED ", await getOwed(player1)); 
        console.log("PLAYER 2 OWED ", await getOwed(player2)); 
        console.log("OWNER OWED ", await getOwed(owner));
    }

    it('deploy the contract', async () => {
        ultimatum = await Ultimatum.new();
        wager = await ultimatum.wager(); 
        console.log("WAGER ", Number(wager));
    });

    it('player1 request player2 to play', async () => {
        await ultimatum.requestMatch(player2, {from: player1, value: wager}); 
        match1.pairHash = await ultimatum.getPairHash(player1, player2); 
        match1.player1 = await ultimatum.getVariableHashFor(match1.pairHash, player1); 
        match1.player2 = await ultimatum.getVariableHashFor(match1.pairHash, player2); 
    });

    it('player 2 accepts game request', async () => { 
        await ultimatum.firstOffer(player1, bn(wager).div(2), {from: player2, value: wager}); 
    })

    it('player 1 accepts offer and sends a return offer', async () => { 
        await ultimatum.secondOffer(player2, bn(wager).div(2), true, {from: player1});
        console.log("PLAYER ONE OWED ", await getOwed(player1)); 
        console.log("PLAYER 2 OWED ", await getOwed(player2)); 
    })

    it('player 2 accepts offer and finished game', async () => { 
        await ultimatum.finishGame(player1, true, {from: player2});
        console.log("PLAYER ONE OWED ", await getOwed(player1)); 
        console.log("PLAYER 2 OWED ", await getOwed(player2)); 
    })

    it('Withdraw everyone', async () => { 
        await ultimatum.withdraw({from: player1});
        await ultimatum.withdraw({from: player2});
    })

    //-------------------------------Game 2---------------------------------------------

    it('player1 request player2 to play', async () => {
        await ultimatum.requestMatch(player2, {from: player1, value: wager}); 
        match1.pairHash = await ultimatum.getPairHash(player1, player2); 
        match1.player1 = await ultimatum.getVariableHashFor(match1.pairHash, player1); 
        match1.player2 = await ultimatum.getVariableHashFor(match1.pairHash, player2); 
    });

    it('player 2 accepts game request and offers 25%', async () => { 
        await ultimatum.firstOffer(player1, bn(wager).div(4), {from: player2, value: wager}); 
    })

    it('player 1 rejects offer and sends a return offer', async () => { 
        await ultimatum.secondOffer(player2, bn(wager).div(4), false, {from: player1});
        await printOwed(accounts[0], player1, player2);  
    })

    it('player 2 accepts offer and finished game', async () => { 
        await ultimatum.finishGame(player1, true, {from: player2});
        await printOwed(accounts[0], player1, player2); 
    })


})
