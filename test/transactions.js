var Transactions = artifacts.require("./Transactions.sol");

contract('Transactions', function(accounts) {
    it("should put 10000 MetaCoin in the first account", function() {
        var contract = Transactions.deployed();
        contract.then(function(instance) {
            return instance.getBalance.call(accounts[0])}).then(function(balance) {
                assert.equal(balance.toNumber(), 10000, "10000 wasn't in the first account");
            })
    });
    it("should add new person to the list", function() {
        var contract = Transactions.deployed();
        contract.then(function(instance) {
            return instance.addPerson(web3.eth.accounts[1], "Satoshi", "Nakamoto").then(function(success) {
                return instance.personExists.call(accounts[1]).then(function(success) {
                    assert.equal(success, true, "Satoshi Nakamoto has been added");
                })
            })
        })
    })
})

// contract.then(function(instance) {
//     return instance.addPerson(web3.eth.accounts[1], "Satoshi", "Nakamoto").then(function(success) {
//         return success
//     })
// })