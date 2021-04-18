import React, { Component } from 'react'
import Web3 from 'web3'
import Token from '../abis/Token.json'
import Farm from '../abis/Farm.json'
import Navbar from './Navbar'
import Main from './Main'
import './App.css'

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = window.web3

    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    const networkId = await web3.eth.net.getId()

    // Load TokenFarm
    const tokenFarmData = Farm.networks[networkId]
    if(tokenFarmData) {
      const tokenFarm = new web3.eth.Contract(Farm.abi, tokenFarmData.address)
      this.setState({ tokenFarm })
      let stakingBalance = await tokenFarm.methods.balanceOf(this.state.account).call()
      this.setState({ stakingBalance: stakingBalance.toString() })
    } else {
      window.alert('Farm contract not deployed to detected network.')
    }

    // Load StakingToken
    const stakingTokenAddr = this.state.tokenFarm.methods.stakingToken();
    if(stakingTokenAddr) {
      const stakingToken = new web3.eth.Contract(Token.abi, stakingTokenAddr)
      this.setState({ stakingToken })
      let stakingTokenBalance = await stakingToken.methods.balanceOf(this.state.account).call()
      this.setState({ stakingTokenBalance: stakingTokenBalance.toString() })
    } else {
      window.alert('StakingToken contract not deployed to detected network.')
    }

    // Load RewardToken
    const rewardTokenAddr = this.state.tokenFarm.methods.rewardToken();
    if(rewardTokenAddr) {
      const rewardToken = new web3.eth.Contract(Token.abi, rewardTokenAddr.address)
      this.setState({ rewardToken })
      let rewardTokenBalance = await rewardToken.methods.balanceOf(this.state.account).call()
      this.setState({ rewardTokenBalance: rewardTokenBalance.toString() })
    } else {
      window.alert('RewardToken contract not deployed to detected network.')
    }

    this.setState({ loading: false })
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  stakeTokens = (amount) => {
    this.setState({ loading: true })
    this.state.daiToken.methods.approve(this.state.tokenFarm._address, amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.tokenFarm.methods.stakeTokens(amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  unstakeTokens = (amount) => {
    this.setState({ loading: true })
    this.state.tokenFarm.methods.unstakeTokens().send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '0x0',
      daiToken: {},
      dappToken: {},
      tokenFarm: {},
      daiTokenBalance: '0',
      dappTokenBalance: '0',
      stakingBalance: '0',
      loading: true
    }
  }

  render() {
    let content
    if(this.state.loading) {
      content = <p id="loader" className="text-center">Loading...</p>
    } else {
      content = <Main
        daiTokenBalance={this.state.daiTokenBalance}
        dappTokenBalance={this.state.dappTokenBalance}
        stakingBalance={this.state.stakingBalance}
        stakeTokens={this.stakeTokens}
        unstakeTokens={this.unstakeTokens}
      />
    }

    return (
      <div>
        <Navbar account={this.state.account} />
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 ml-auto mr-auto" style={{ maxWidth: '600px' }}>
              <div className="content mr-auto ml-auto">
                <a
                  href="http://www.dappuniversity.com/bootcamp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                </a>

                {content}

              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
