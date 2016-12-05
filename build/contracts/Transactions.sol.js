var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Transactions error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Transactions error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Transactions contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Transactions: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Transactions.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Transactions not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_money",
            "type": "uint256"
          }
        ],
        "name": "transferFromOwner",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getPeople",
        "outputs": [
          {
            "name": "",
            "type": "bytes32[]"
          },
          {
            "name": "",
            "type": "bytes32[]"
          },
          {
            "name": "",
            "type": "uint256[]"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_personId",
            "type": "address"
          },
          {
            "name": "_firstName",
            "type": "bytes32"
          },
          {
            "name": "_lastName",
            "type": "bytes32"
          }
        ],
        "name": "addPerson",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getTransactions",
        "outputs": [
          {
            "name": "",
            "type": "address[]"
          },
          {
            "name": "",
            "type": "address[]"
          },
          {
            "name": "",
            "type": "uint256[]"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "peopleArray",
        "outputs": [
          {
            "name": "personId",
            "type": "address"
          },
          {
            "name": "firstName",
            "type": "bytes32"
          },
          {
            "name": "lastName",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_money",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "transactionArray",
        "outputs": [
          {
            "name": "sender",
            "type": "address"
          },
          {
            "name": "receiver",
            "type": "address"
          },
          {
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_personId",
            "type": "address"
          }
        ],
        "name": "getBalance",
        "outputs": [
          {
            "name": "_balance",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [],
        "type": "constructor"
      }
    ],
    "unlinked_binary": "0x606060405260028054600160a060020a03191633908117909155600160a060020a031660009081526003602052604090206127109055610a65806100436000396000f3606060405236156100775760e060020a60003504630f18ac07811461007c5780634f995d08146100c8578063537e5e661461024e57806383920e90146103075780638da5cb5b14610526578063a4e1ca5a1461053d578063beabacc8146105dc578063c82ef8fb14610651578063f8b2cb4f1461069b575b610002565b34610002576106c2600435602435604080516060810182526000808252602082810182905282840182905233600160a060020a031682526003905291822054839010156108725761086b565b34610002576040805160208181018352600080835283518083018552818152845180840186528281528551808501875283815286518086018852848152875180870189528581528851606081018a52868152968701869052868901869052975185546106d6999597949690959394929392909186908059106101475750595b90808252806020026020018201604052801561015e575b5094508560405180591061016f5750595b908082528060200260200182016040528015610186575b509350856040518059106101975750595b9080825280602002602001820160405280156101ae575b509250600091505b8582101561091957600080548390811015610002579060005260206000209060030201600050604080516060810182528254600160a060020a0316815260018301546020820181905260029390930154918101919091528651909250869084908110156100025760209081029091010152604081015184518590849081101561000257602090810290910101528051610927906106a7565b34610002576106c260043560243560443560408051606081018252600160a060020a038581168083526020830186905292820184905260009233909116146102a957600160a060020a03851682526003602052604082208290555b600080546001810180835582818380158290116109495760030281600302836000526020600020918201910161094991905b80821115610915578054600160a060020a031916815560006001820181905560028201556003016102db565b34610002576040805160208181018352600080835283518083018552818152845180840186528281528551808501875283815286518086018852848152875180870189528581528851606081018a5286815296870186905286890186905260015498516106d699959794969394929391929086908059106103855750595b90808252806020026020018201604052801561039c575b509450856040518059106103ad5750595b9080825280602002602001820160405280156103c4575b509350856040518059106103d55750595b9080825280602002602001820160405280156103ec575b509250600091505b858210156109195760018054839081101561000257506000525060408051606081018252600383027fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6810154600160a060020a039081168084527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf783015490911660208401527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf89190910154928201929092528551909190869084908110156100025790602001906020020190600160a060020a03169081815260200150508060200151848381518110156100025790602001906020020190600160a060020a0316908181526020015050806040015183838151811015610002575050602083810285010152600191909101906103f4565b3461000257610796600254600160a060020a031681565b34610002576107b3600435600080548290811015610002575080527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5636003909102908101547f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5648201547f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e56590920154600160a060020a0391909116919083565b34610002576106c26004356024356044356040805160608101825260008082526020828101829052828401829052600160a060020a038716825260039052918220548214806106435750600160a060020a0385166000908152600360205260409020548390105b156109995760009150610991565b34610002576107dc6004356001805482908110156100025790600052602060002090600302016000508054600182015460029290920154600160a060020a03918216935091169083565b34610002576108066004355b600160a060020a031660009081526003602052604090205490565b604080519115158252519081900360200190f35b604051808060200180602001806020018481038452878181518152602001915080519060200190602002808383829060006004602084601f0104600302600f01f1509050018481038352868181518152602001915080519060200190602002808383829060006004602084601f0104600302600f01f1509050018481038252858181518152602001915080519060200190602002808383829060006004602084601f0104600302600f01f150905001965050505050505060405180910390f35b60408051600160a060020a03929092168252519081900360200190f35b60408051600160a060020a03949094168452602084019290925282820152519081900360600190f35b60408051600160a060020a0394851681529290931660208301528183015290519081900360600190f35b60408051918252519081900360200190f35b5050509190906000526020600020906003020160005082518154600160a060020a031990811690911782556020840151600183810180549093169091179091556040840151600292909201919091559250505b5092915050565b33600160a060020a03908116600081815260036020908152604080832080548990039055938816808352918490208054880190559184529083015242908201526001805480820180835582818380158290116108185760030281600302836000526020600020918201910161081891905b80821115610915578054600160a060020a031990811682556001820180549091169055600060028201556003016108e3565b5090565b509297919650945092505050565b83838151811015610002575050602083810285010152600191909101906101b6565b5050509190906000526020600020906003020160005082518154600160a060020a03191617815560208301516001828101919091556040840151600292909201919091559250505b509392505050565b600160a060020a0385811660008181526003602090815260408083208054899003905593881680835291849020805488019055918452908301524290820152600180548082018083558281838015829011610a0d57600302816003028360005260206000209182019101610a0d91906108e3565b5050509190906000526020600020906003020160005082518154600160a060020a031990811690911782556020840151600183810180549093169091179091556040840151600292909201919091559250610991905056",
    "events": {},
    "updated_at": 1480963781055,
    "links": {},
    "address": "0x04f4b44d431c4edf91356c39d27f3905db1068d3"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Transactions";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Transactions = Contract;
  }
})();
