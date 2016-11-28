import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Web3 from 'web3';
import _ from 'lodash';

// Ethereum client interacting with our localhost testRPC
var ETHEREUM_CLIENT = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

// ABI and Address of contract living on the localhost
var contractABI = [{"constant":true,"inputs":[],"name":"getPeople","outputs":[{"name":"","type":"bytes32[]"},{"name":"","type":"bytes32[]"},{"name":"","type":"uint256[]"},{"name":"","type":"uint256[]"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"peopleArray","outputs":[{"name":"personId","type":"address"},{"name":"firstName","type":"bytes32"},{"name":"lastName","type":"bytes32"},{"name":"age","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_money","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_personId","type":"address"},{"name":"_firstName","type":"bytes32"},{"name":"_lastName","type":"bytes32"},{"name":"_age","type":"uint256"}],"name":"addPerson","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_personId","type":"address"}],"name":"getBalance","outputs":[{"name":"_balance","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[],"type":"constructor"}];

var contractAddress = '0xc76b60cc2f1748cb550a03c477ad378fc2ce593b';

// Intsance to contract
var transactionsContract = ETHEREUM_CLIENT.eth.contract(contractABI).at(contractAddress);

// var sendEvent = transactionsContract.transfer({fromBlock: 0, toBlock: 'latest'});

// sendEvent.watch(function(error, log){
//     console.log(log);
//});

class App extends Component {

  constructor(props){
    super(props)
    this.state = {
      firstNames: [],
      lastNames: [],
      ages: [],
      balances: []
    }
  }

  componentWillMount(){
    var data = transactionsContract.getPeople();
    this.setState({
      firstNames: String(data[0]).split(','),
      lastNames: String(data[1]).split(','),
      ages: String(data[2]).split(','),
      balances: String(data[3]).split(',')
    })
  }

  render() {

    // console.log(ETHEREUM_CLIENT.eth.getTransactionCount());
    // console.log(ETHEREUM_CLIENT.eth);
    // console.log(ETHEREUM_CLIENT.eth.getTransaction('0x208414384a62bfcfb0e82ab94083df0117a086b29790bafd8b941f17ee6a8f4d'));


    var tableRows = [];
    _.each(this.state.firstNames, (value, index) => {
      tableRows.push(
        <tr key={index}>
          <td>{ETHEREUM_CLIENT.toAscii(this.state.firstNames[index])}</td>
          <td>{ETHEREUM_CLIENT.toAscii(this.state.lastNames[index])}</td>
          <td>{this.state.ages[index]}</td>
          <td>{this.state.balances[index]}</td>
        </tr>
      )
    });

    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1>The Simplest Blockchain Model</h1>
        </div>
        <div>
          <table className="App-table">
            <thead className="App-thead">
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Age</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {tableRows}
            </tbody>
          </table>

        </div>
      </div>
    );
  } // End render method
} // End App class

export default App;
