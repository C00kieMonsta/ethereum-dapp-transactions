import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Web3 from 'web3';
import _ from 'lodash';
import T from 'moment';

// Ethereum client interacting with our localhost testRPC
var ETHEREUM_CLIENT = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

// ABI and Address of contract living on the localhost [JSON.stringify]
var contractABI = [{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_money","type":"uint256"}],"name":"transferFromOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getPeople","outputs":[{"name":"","type":"bytes32[]"},{"name":"","type":"bytes32[]"},{"name":"","type":"uint256[]"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_personId","type":"address"},{"name":"_firstName","type":"bytes32"},{"name":"_lastName","type":"bytes32"}],"name":"addPerson","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getTransactions","outputs":[{"name":"","type":"address[]"},{"name":"","type":"address[]"},{"name":"","type":"uint256[]"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"peopleArray","outputs":[{"name":"personId","type":"address"},{"name":"firstName","type":"bytes32"},{"name":"lastName","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_money","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"transactionArray","outputs":[{"name":"sender","type":"address"},{"name":"receiver","type":"address"},{"name":"timestamp","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_personId","type":"address"}],"name":"getBalance","outputs":[{"name":"_balance","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[],"type":"constructor"}];

var contractAddress = '0xa27b40b1f90141c26c96d017ac9ff14bbeac9906';

// Intsance to contract
var transactionsContract = ETHEREUM_CLIENT.eth.contract(contractABI).at(contractAddress);

// var sendEvent = transactionsContract.transfer({fromBlock: 0, toBlock: 'latest'});

class App extends Component {

  constructor(props){
    super(props)
    this.state = {
      firstNames: [],
      lastNames: [],
      balances: [],
      senders: [],
      receivers: [],
      timestamps: []
    }
  }

  componentWillMount(){
    var data = transactionsContract.getPeople();
    var transactions = transactionsContract.getTransactions();
    this.setState({
      firstNames: String(data[0]).split(','),
      lastNames: String(data[1]).split(','),
      balances: String(data[2]).split(','),
      senders: String(transactions[0]).split(','),
      receivers: String(transactions[1]).split(','),
      timestamps: String(transactions[2]).split(',')
    })
  }

  _returnDate(uDate){
    var t = new Date(0);
    t.setUTCSeconds(uDate);
    var converted_date = T(t).format("DD/MM/YYYY - hh:MM:ss");
    return converted_date;
  }

  render() {
    var tableRows = [];
    _.each(this.state.firstNames, (value, index) => {
      tableRows.push(
        <tr key={index}>
          <td>{ETHEREUM_CLIENT.toAscii(this.state.firstNames[index])}</td>
          <td>{ETHEREUM_CLIENT.toAscii(this.state.lastNames[index])}</td>
          <td>{this.state.balances[index]}</td>
        </tr>
      )
    });

    var transactionsTable = [];
    _.each(this.state.senders, (value, index) => {
      transactionsTable.push(
        <tr key={index}>
          <td>{this.state.senders[index]}</td>
          <td>{this.state.receivers[index]}</td>
          <td>{this._returnDate(this.state.timestamps[index])}</td>
        </tr>
      );
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
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {tableRows}
            </tbody>
          </table>

          <table className="App-table">
            <thead className="App-thead">
              <tr>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactionsTable}
            </tbody>
          </table>

        </div>
      </div>
    );
  } // End render method
} // End App class

export default App;
