import React, { Component, createContext } from "react";

import Web3 from "web3";
import ethers from "ethers";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";

const lockerABI = require("../abi/Locker.json");
const DAI_ABI = require("../abi/DaiAbi.json");
const wETH_ABI = require("../abi/wETHAbi.json");
const {
    Locker,
    KovanDAI,
    KovanWETH,
    RaidGuild,
    LexArbitration,
} = require("../utils/Constants").contract_addresses;

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: process.env.REACT_APP_INFURA_ID,
        },
    },
};

const web3Modal = new Web3Modal({
    network: "mainnet",
    cacheProvider: false,
    providerOptions,
});

export const AppContext = createContext();

class AppContextProvider extends Component {
    state = {
        //web3 needs
        address: "",
        provider: "",
        web3: "",
        chainID: "",
        //contracts & address
        locker: "",
        client_address: "",
        resolver_address: LexArbitration,
        spoils_address: RaidGuild,
        //locker info
        cap: "",
        confirmed: "",
        locked: "",
        released: "",
        token: "",
        termination: "",
        client: "",
        //airtable info
        escrow_index: "",
        raid_id: "",
        project_name: "",
        client_name: "",
        start_date: "",
        end_date: "",
        link_to_details: "",
        brief_description: "",
        //math needs
        spoils_percent: 0.1,
        //checks
        isClient: false,
        isLoading: false,
    };

    async componentDidMount() {
        const web3 = new Web3(
            new Web3.providers.HttpProvider(
                `https://kovan.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`
            )
        );
        const locker = new web3.eth.Contract(lockerABI, Locker);
        const DAI = new web3.eth.Contract(DAI_ABI, KovanDAI);
        const wETH = new web3.eth.Contract(wETH_ABI, KovanWETH);
        const chainID = await web3.eth.net.getId();

        this.setState({ web3, locker, DAI, wETH, chainID });
    }

    setAirtableState = (params) => {
        this.setState(
            {
                escrow_index: params.escrow_index,
                raid_id: params.raid_id,
                project_name: params.project_name,
                client_name: params.client_name,
                start_date: params.start_date,
                end_date: params.end_date,
                link_to_details: params.link_to_details,
                brief_description: params.brief_description,
            },
            () => this.fetchLockerInfo()
        );
    };

    fetchLockerInfo = async () => {
        if (this.state.escrow_index !== "") {
            let {
                cap,
                confirmed,
                locked,
                released,
                token,
                termination,
                client,
            } = await this.state.locker.methods
                .lockers(this.state.escrow_index)
                .call();
            this.setState({
                cap,
                confirmed,
                locked,
                released,
                token,
                termination,
                client,
            });
        }
    };

    connectAccount = async () => {
        try {
            this.updateLoadingState();
            web3Modal.clearCachedProvider();

            const provider = await web3Modal.connect();
            const web3 = new Web3(provider);
            const accounts = await web3.eth.getAccounts();
            const locker = new web3.eth.Contract(lockerABI, Locker);
            const DAI = new web3.eth.Contract(DAI_ABI, KovanDAI);
            const wETH = new web3.eth.Contract(wETH_ABI, KovanWETH);
            let chainID = await web3.eth.net.getId();

            let ethers_locker = new ethers.Contract(
                Locker,
                lockerABI,
                new ethers.providers.InfuraProvider(
                    "kovan",
                    process.env.REACT_APP_INFURA_ID
                )
            );

            let isClient = false;

            if (accounts[0] === this.state.client) {
                isClient = true;
            }

            provider.on("chainChanged", (chainId) => {
                this.setState({ chainID: chainId });
            });

            provider.on("accountsChanged", (accounts) => {
                window.location.href = "/";
            });

            this.setState(
                {
                    address: accounts[0],
                    provider,
                    web3,
                    isClient,
                    locker,
                    DAI,
                    wETH,
                    chainID,
                    ethers_locker,
                },
                () => {
                    this.updateLoadingState();
                }
            );
        } catch (err) {
            this.updateLoadingState();
        }
    };

    updateLoadingState = () => {
        this.setState({ isLoading: !this.state.isLoading });
    };

    render() {
        return (
            <AppContext.Provider
                value={{
                    ...this.state,
                    setAirtableState: this.setAirtableState,
                    connectAccount: this.connectAccount,
                    updateLoadingState: this.updateLoadingState,
                }}
            >
                {this.props.children}
            </AppContext.Provider>
        );
    }
}

export default AppContextProvider;
