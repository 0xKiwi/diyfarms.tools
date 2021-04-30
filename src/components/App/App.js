import React, { Component } from "react";
import Web3 from "web3";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

import Navbar from "../Navbar";
import "./App.css";
import Farm from "../Farm/Farm";

class App extends Component {
  async componentWillMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
  }

  async loadBlockchainData() {
    const web3 = window.web3;

    const accounts = await web3.eth.getAccounts();
    this.setState({ account: accounts[0] });

    this.setState({ loading: false });
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert(
        "Non-Ethereum browser detected. You should consider trying MetaMask!"
      );
    }
  }

  constructor(props) {
    super(props);
    this.state = {
      account: "0x0",
      stakingToken: {},
      rewradToken: {},
      tokenFarm: {},
      stakingTokenBalance: "0",
      rewardTokenBalance: "0",
      stakingBalance: "0",
      loading: true,
    };
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        <Router>
          <div>
            <nav>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/farm">Farm</Link>
                </li>
              </ul>
            </nav>
            <Switch>
              <Route path="/farm">
                <Farm />
              </Route>
            </Switch>
          </div>
        </Router>
      </div>
    );
  }
}

export default App;
