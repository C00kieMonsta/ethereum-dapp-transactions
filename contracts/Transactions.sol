// Version of compiler
pragma solidity ^0.4.2;

contract Transactions {

  // Array of Person instances
  Person[] public peopleArray;

  // Array of Transaction intances
  Transaction[] public transactionArray;

  // Address of the owner of the contract
  address public owner;

  /*
    Mapping of adresses with balance
    This is the equivalent of creating an associative array
    The key of the mapping is the address of the person and the value
    is the balance that each person
  */
  mapping (address => uint) personToBalance;

/**
  Solidity does not let us pass a strings yet, so we have
  to use bytes32 for the firstName and lastName
 */

  // Structure of a Person object
  struct Person {
    address personId;
    bytes32 firstName;
    bytes32 lastName;
  }

  struct Transaction {
    address sender;
    address receiver;
    uint timestamp;
  }

  /*
    Constructor of contract for initial setups which is going to be
    called once when we deploy the contract
  */
  function Transactions() public {
    owner = msg.sender;
    personToBalance[msg.sender] = 10000;
  }

  // Adding a person to the contract with initial balance of 0
  function addPerson(address _personId, bytes32 _firstName, bytes32 _lastName) public returns (bool success) {
    Person memory newPerson;
    newPerson.personId = _personId;
    newPerson.firstName = _firstName;
    newPerson.lastName = _lastName;
    if (_personId != msg.sender) {
      personToBalance[_personId] = 0;
    }
    peopleArray.push(newPerson);
    return true;
  }

  // Mapping the balance and the address
  function getBalance(address _personId) public constant returns (uint _balance) {
    return personToBalance[_personId];
  }

  // Iterating over peopleArray in order to get a tuple containing each person of the conract
  function getPeople() public constant returns (bytes32[], bytes32[], uint[]) {

    // Variable storing the length of people (like in C -> not dynamic sized)
    uint length = peopleArray.length;

    // Arrays to be returned
    bytes32[] memory firstNames = new bytes32[](length);
    bytes32[] memory lastNames = new bytes32[](length);
    uint[] memory balances = new uint[](length);

    // Looping through peopleArray
    for (uint i = 0; i < length; i++) {
      Person memory currentPerson;
      currentPerson = peopleArray[i];
      firstNames[i] = currentPerson.firstName;
      lastNames[i] = currentPerson.lastName;
      balances[i] = getBalance(currentPerson.personId);
    }
    return (firstNames, lastNames, balances);
  }

  function getTransactions() public constant returns (address[], address[], uint[]) {

    // Length of transaction array
    uint length = transactionArray.length;

    // Arrays to be returned
    address[] memory senders = new address[](length);
    address[] memory receivers = new address[](length);
    uint[] memory timestamps = new uint[](length);

    // Looping through peopleArray
    for (uint i = 0; i < length; i++) {
      Transaction memory currentTransaction;
      currentTransaction = transactionArray[i];
      senders[i] = currentTransaction.sender;
      receivers[i] = currentTransaction.receiver;
      timestamps[i] = currentTransaction.timestamp;
    }
    return (senders, receivers, timestamps);
  }


  // Transfer money from owner to other
  function transferFromOwner(address _to, uint _money) public returns(bool) {
    if (personToBalance[msg.sender] < _money) {
      return false;
    }
    Transaction memory newTransaction;
    personToBalance[msg.sender] -= _money;
    personToBalance[_to] += _money;
    newTransaction.sender = msg.sender;
    newTransaction.receiver = _to;
    newTransaction.timestamp = now;
    transactionArray.push(newTransaction);
    return true;
  }

  // Transfer from one adress to another address
  function transfer(address _from, address _to, uint _money) public returns(bool) {
    if (personToBalance[_from] == 0 || personToBalance[_from] < _money) {
      return false;
    }
    Transaction memory newTransaction;
    personToBalance[_from] -= _money;
    personToBalance[_to] += _money;
    newTransaction.sender = _from;
    newTransaction.receiver = _to;
    newTransaction.timestamp = now;
    transactionArray.push(newTransaction);
    return true;
  }
}

/*
    When sending money from one address to another, you get this to the log:

    truffle(default)> contract.transfer(pers2, pers1, 100)
    '0xa7edcc943002ea0406fe8742197bf637c0457841061c76e6427a13109e4e41cf'

    This hash corresponds to the transaction between pers2 and pers1, you can access
    the info about this transaction like this:

      web3.eth.getTransaction("0xabce85e979001aa29bc36efbbb6d3b2f75849702e7587d9193691469738ff6af")

    web3 is an object from web3 library that allows you to interact with the 'eth' or ethereum blockchain
    through a bunch of mehods like 'getTransaction'. This is what you would get:

    {
      hash: '0xabce85e979001aa29bc36efbbb6d3b2f75849702e7587d9193691469738ff6af',
      nonce: 7,
      blockHash: '0x4f8a887e02090c2423153ebd17686ba8bda1e08e48a6471f66b7640eddeff080',
      blockNumber: 8,
      transactionIndex: 0,
      from: '0x11989b1ad656a7a728bad8763d4a7c68b0fe7625',  // the owner of the contract is paying for the transaction cost
      to: '0x336cc10032b4af8956777ab3ed2200bb4ea529e4', // Some random address
      value: { [String: '0'] s: 1, e: 0, c: [ 0 ] },
      gas: 4712388,
      gasPrice: { [String: '100000000000'] s: 1, e: 11, c: [ 100000000000 ] },
      input: '0x537e5e660000000000000000000000008d0fe3b090fd0185cb3ab1779ad57da30139fd8e4775696c6c61756d650000000000000000000000000000000000000000000000436172746f6e0000000000000000000000000000000000000000000000000000'
    }

*/
