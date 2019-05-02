import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';


import Ultimatum from "./contracts/Ultimatum.json";
import getWeb3 from "./utils/getWeb3";

import * as Utils from 'web3-utils';
import swal from 'sweetalert'; 

import Nav from "./components/Nav.jsx";
import Countdown from "./components/LotteryCountdown.jsx";

import {Layout} from "antd"; 

import "./App.css";

const { Content, Footer, Header } = Layout;

class App extends Component {
    state = {
        web3: null,
        network: 'development',
        contract: null,
        user: {
            address: '',
            winnings: 0
        }
    };

    componentDidMount = async () => {
        try {
            let {user, web3, network} = this.state;
            // Get network provider and web3 instance.
            web3 = await getWeb3();

            const networkId = await web3.eth.net.getId();

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

            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({ web3, user, contract: instance });
        } catch (error) {
            // Catch any errors for any of the above operations.
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };


    render() {
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <Layout className="layout">

                <Layout className="layout">

                    <Nav user={this.state.user} />

                </Layout>

                <Layout>
                    <Content className="App"> 
                        <Countdown />
                        </Content>
                </Layout>

            </Layout>

        );
    }
}

export default App;
