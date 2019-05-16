import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Web3 from "web3";


import Ultimatum from "./contracts/Ultimatum.json";
import getWeb3 from "./utils/getWeb3";

import * as Utils from 'web3-utils';
import swal from 'sweetalert';
import makeBlockie from 'ethereum-blockies-base64';

// Components
import Nav from "./components/Nav.jsx";
import PlayerList from "./components/PlayerList.jsx";
import LotteryCountdown from "./components/LotteryCountdown.jsx";
import Offer from "./components/Offer.jsx"; 

import { Layout, Button, Row } from "antd";

import "./App.css";

const { Content, Footer, Header } = Layout;

class App extends Component {
    state = {
        web3: null,
        web3Socket: null,
        network: 'development',
        contract: null,
        wager: 0,
        timeToRespond: 0,
        lotteryLength: 0,
        nonce: 1,
        blocksLeft: 0,
        currentBlock: null,
        userAvatar: {
        },
        user: {
            address: '',
            winnings: 0,
            participant: false
        },
        lottery: {
            nonce: 1,
            finishBlock: 0,
            ethSum: 0,
            participants: [],
            finished: false,      // Time deadline is up
            title: "",
            ready: false,         // Time deadline finished + enough participants
        },
        game: {
            nonce: 0,
            proposer: "",
            responder: "",
            offer: 0,
            resultBlock: 0,
            acceptDeadline: 0,
            ethSum: 0
        }
    };


    componentDidMount = async () => {
        try {
            let { user, web3, network, web3Socket, contractSocket } = this.state;
            // Get network provider and web3 instance.
            web3 = await getWeb3();

            const networkId = await web3.eth.net.getId() || 3;

            const web3Provider = "wss://ropsten.infura.io/ws/v3/" + process.env.REACT_APP_INFURA;
            web3Socket = new Web3(new Web3.providers.WebsocketProvider(web3Provider));

            // Find network of injected web3
            if (window.web3) {
                user.address = Utils.toChecksumAddress(await web3.eth.defaultAddress);
                if (user.address === '') user.address = Utils.toChecksumAddress(await web3.eth.getCoinbase());
                if (networkId === 1) {
                    network = 'mainnet';
                    swal({
                        title: "Inui is on Ropsten network",
                        text: "Please change to Ropsten network",
                        icon: "error",
                        button: "Ok",
                    });
                    throw "Contract not deployed to this network";
                    return false;
                }
                user.balance = await web3.eth.getBalance(user.address);
                if (networkId === 3) network = 'ropsten';
                else network = 'development';

            }

            // Get the contract instance.
            const deployedNetwork = Ultimatum.networks[networkId];
            const instance = new web3.eth.Contract(
                Ultimatum.abi,
                deployedNetwork && deployedNetwork.address,
            );

            contractSocket = new web3Socket.eth.Contract(
                Ultimatum.abi,
                deployedNetwork && deployedNetwork.address,
            );

            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({ web3, user, contract: instance, contractSocket });
            await this.updateBlock();
            await this.syncConstants();
            await this.syncLottery();
            await this.watchEvents(); 
        } catch (error) {
            // Catch any errors for any of the above operations.
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    grabAvatar = (address) => {
        let { userAvatar } = this.state;
        if (address === '' || address === undefined || address === null) { 
            address = 'guest'
         }
        userAvatar[address] = makeBlockie(address);
        // console.log("CREATING BLOCKY ", address);
        // this.setState({userAvatar});
        return userAvatar[address];
    }

    updateBlock = async () => {
        let { currentBlock, lottery, blocksLeft } = this.state;

        currentBlock = await this.state.web3.eth.getBlock('latest');

        console.log("BLOCK UPDATED ", currentBlock.number, "BlOCKS LEFT ", lottery.finishBlock - currentBlock.number);
        lottery.title = "Click play to join lottery"
        blocksLeft = lottery.finishBlock - currentBlock.number;
        if (blocksLeft < 0) {
            // Are there enough participants
            lottery.finished = true;
            if (this.isEnoughParticipants(lottery)) {
                lottery.title = "Lottery is finished. Play to start new Lottery";
                lottery.ready = true;
                blocksLeft = 0;
                console.log("Player needs to resolve lottery");
            } else {
                lottery.title = "Lottery needs more players";
            }
        }
        this.setState({ currentBlock, lottery, blocksLeft });

        setTimeout(this.updateBlock, 10000);
    }

    watchEvents = () => {
        let { contractSocket, lottery, user, game } = this.state;

        contractSocket.events.LogJoinedLottery({
            filter: {},
            fromBlock: 'latest'
        }, (error, event) => {
            if (error) console.log(error);
            if (event) {
                console.log("LOTTERY JOINED ", event);
                let userAddr = event.returnValues.user;
                if (userAddr === user.address){
                    user.participant = true; 
                }
                lottery.participants.push(userAddr); 
                lottery.ethSum += this.state.wager; 
                this.setState({lottery, user}); 
            }
        });

        contractSocket.events.LogNewGame({
            filter: {},
            fromBlock: 'latest'
        }, (error, event) => {
            if (error) console.log(error);
            if (event) {
                console.log("GAME STARTED ", event);
                game.proposer = event.returnValues.proposer;
                game.responder = event.returnValues.responder;
                game.nonce = event.returnValues.nonce; 
                game.ethSum = lottery.ethSum; 
                this.setState({game});
            }
        });

        contractSocket.events.LogOfferMade({
            filter: {},
            fromBlock: 'latest'
        }, (error, event) => {
            if (error) console.log(error);
            if (event) {
                console.log("OFFER MADE ", event);
            }
        });

        contractSocket.events.LogGameFinished({
            filter: {},
            fromBlock: 'latest'
        }, (error, event) => {
            if (error) console.log(error);
            if (event) {
                console.log("GAME FINISHED ", event);
            }
        });
    }

    syncConstants = async () => {
        let { contract, wager, timeToRespond, lotteryLength, user, nonce } = this.state;
        lotteryLength = await contract.methods.lotteryLength().call();
        timeToRespond = await contract.methods.timeToRespond().call();
        wager = await contract.methods.wager().call();
        nonce = await contract.methods.gameNonce().call();
        user.winnings = await contract.methods.owed(user.address).call()
        console.log("LOTTERY CONSTANTS SYNCED ");
        this.setState({ lotteryLength, timeToRespond, wager, user, nonce });
    }



    syncLottery = async () => {
        let { contract, lottery, nonce, userAvatar } = this.state;
        nonce = await contract.methods.gameNonce().call();
        let game = await contract.methods.getGame(nonce).call();
        lottery.finishBlock = Number(game[3]);
        lottery.participants = await contract.methods.getCommitted().call();
        lottery.participants.map(player => { 
            userAvatar[player] = this.grabAvatar(player);
        })
        lottery.ethSum = Number(game[5]);
        console.log("PARTICIPANTS ", lottery.participants);
        console.log("ETH IN LOTTERY ", lottery.ethSum);
        // console.log("GAME DATA ", game); 
        // console.log("Lottery ends at block ", lottery.finishBlock);
        // console.log("Current Block ", this.state.currentBlock.number);
        // console.log("Lottery finishes in ", lottery.finishBlock - this.state.currentBlock.number, " blocks");
        this.setState({ lottery, nonce });
    }

    joinLottery = async () => {
        let { contract, wager, user } = this.state;
        console.log("USER ", user);
        await contract.methods.play().send({ from: user.address, value: wager });

    }

    makeOffer = async (value) => {
        let { contract, game, user } = this.state; 
        await contract.methods.makeOffer(game.nonce, value).send({from: user.address})
    }

    isEnoughParticipants = (lottery) => {
        if (lottery.participants === undefined || lottery.participants === null || lottery.participants.length < 2) {
            return false;
        }
        return true;
    }


    render() {
        let {lottery, user} = this.state;
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <Layout className="App">

                <Layout>
                    <Nav user={this.state.user} />
                </Layout>

                <Layout style={{display:'flex', justifyContent:'center'}}>
                    <Content style={{  backgroundColor: 'white' }}>
                        <br></br><br></br><br></br>
                        <Row type="flex" align="middle" justify="center" >
                            <LotteryCountdown blocksLeft={this.state.blocksLeft} lottery={this.state.lottery} />
                        </Row>
                        <br></br><br></br><br></br><br></br>
                        <Row>
                            {user.participant && lottery.ready ?
                                <Button onClick={this.resolveLottery} type="primary" shape="round" size="large">Resolve Lottery</Button>
                                :
                                <Button onClick={this.joinLottery} type="primary" shape="round" size="large">Play</Button>
                            }
                            {/* <Button onClick={this.joinLottery} type="primary" shape="round" size="large">Play</Button> */}

                        </Row>
                        <br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
                        {/* <Row type="flex" align="middle" justify="center">
                            <PlayerList userAvatar={this.state.userAvatar} lottery={this.state.lottery} />
                        </Row> */}
                        <Row type="flex" align="middle" justify="center">
                            <Offer userAvatar={this.state.userAvatar} lottery={this.state.lottery} game={this.state.game} />
                        </Row>
                    </Content>
                </Layout>
            </Layout>

        );
    }
}

export default App;
