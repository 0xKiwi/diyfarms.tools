import React, { Component } from 'react'
import Web3 from 'web3'
import Token from '../../abis/Token.json'
import FarmJson from '../../abis/Farm.json'
import Navbar from '../Navbar'
import Staking from '../Staking/Staking'
import './Farm.css'

class Farm extends Component {

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
    const farmAddress = "0xE811E9F796c876e1039CF5dA758FB016a3566cDA"
    if(farmAddress) {
      const tokenFarm = new web3.eth.Contract(FarmJson.abi, farmAddress)
      this.setState({ tokenFarm })
      let stakingBalance = await tokenFarm.methods.balanceOf(this.state.account).call()
      this.setState({ stakingBalance: stakingBalance.toString() })
    } else {
      window.alert('Farm contract not deployed to detected network.')
    }

    // Load StakingToken
    const stakingTokenAddr = await this.state.tokenFarm.methods.stakingToken().call();
    console.log(stakingTokenAddr);
    if(stakingTokenAddr) {
      const stakingToken = new web3.eth.Contract(Token.abi, stakingTokenAddr)
      this.setState({ stakingToken })
      let stakingTokenBalance = await stakingToken.methods.balanceOf(this.state.account).call()
      this.setState({ stakingTokenBalance: stakingTokenBalance.toString() })
    } else {
      window.alert('StakingToken contract not deployed to detected network.')
    }

    // Load RewardToken
    const rewardTokenAddr = await this.state.tokenFarm.methods.rewardToken().call();
    console.log(rewardTokenAddr);
    if(rewardTokenAddr) {
      const rewardToken = new web3.eth.Contract(Token.abi, rewardTokenAddr)
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
    this.state.stakingToken.methods.approve(this.state.tokenFarm._address, amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.tokenFarm.methods.stakeTokens(amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  unstakeTokens = (amount) => {
    this.setState({ loading: true })
    this.state.stakingToken.methods.unstakeTokens().send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '0x0',
      stakingToken: {},
      rewardToken: {},
      tokenFarm: {},
      stakingTokenBalance: '0',
      rewardTokenBalance: '0',
      stakingBalance: '0',
      loading: true
    }
  }

  render() {
    let content
    if(this.state.loading) {
      content = <p id="loader" className="text-center">Loading...</p>
    } else {
      content = <Staking
        stakingTokenBalance={this.state.stakingTokenBalance}
        rewardTokenBalance={this.state.rewardTokenBalance}
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

export default Farm;
