pragma solidity ^0.4.2;

contract Transactions{

  // Array of Person instances
  Person[] public peopleArray;

  // Address of the owner of the contract
  address public owner;

  // Mapping of adresses with balance
  mapping (address => uint) personToBalance;

  // Constructor of contract for initial setups
  function Transactions(){
    owner = msg.sender;
    personToBalance[msg.sender] = 10000;
  }

  // Structure of a Person object
  struct Person{
    address personId;
    bytes32 firstName;
    bytes32 lastName;
    uint age;
  }

  // Adding a person to the contract with initial balance of 0
  function addPerson(address _personId, bytes32 _firstName, bytes32 _lastName, uint _age) returns (bool success){
    Person memory newPerson;
    newPerson.personId = _personId;
    newPerson.firstName = _firstName;
    newPerson.lastName = _lastName;
    newPerson.age = _age;
    if (_personId != msg.sender){
      personToBalance[_personId] = 0;
    }
    peopleArray.push(newPerson);
    return true;
  }

  // Mapping the balance and the address
  function getBalance(address _personId) constant returns(uint _balance){
    return personToBalance[_personId];
  }

  // Iterating over peopleArray in order to get a tuple containing each person of the conract
  function getPeople() constant returns (bytes32[], bytes32[], uint[], uint[]){

    // Variable storing the length of people (like in C -> not dynamic sized)
    uint length = peopleArray.length;

    // Arrays to be returned
    bytes32[] memory firstNames = new bytes32[](length);
    bytes32[] memory lastNames = new bytes32[](length);
    uint[] memory ages = new uint[](length);
    uint[] memory balances = new uint[](length);

    // Looping through peopleArray
    for (uint i = 0; i < length; i++){
      Person memory currentPerson;
      currentPerson = peopleArray[i];
      firstNames[i] = currentPerson.firstName;
      lastNames[i] = currentPerson.lastName;
      ages[i] = currentPerson.age;
      balances[i] = getBalance(currentPerson.personId);
    }
    return (firstNames, lastNames, ages, balances);
  }

  function transfer(address _to, uint _money) returns(bool){
    if (personToBalance[msg.sender] < _money){
      return false;
    }
    personToBalance[msg.sender] -= _money;
    personToBalance[_to] += _money;
    return true;
  }

}
