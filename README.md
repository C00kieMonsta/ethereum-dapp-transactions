# ethereum-dapp-transactions
A simple DAPP in Solidity using React js for the UI

The first step would be to install testrpc. This is node.js package, so the easiest way to download this package, would be to first download “node.js” by going on this website “” or by using a package manager such as homebrew.

For mac OS:

1. Downloading node via the website: https://nodejs.org/en/

2. Downloading node via Homebrew package manager:

	brew update
	brew upgrade
	brew install node

Once node is installed, you should have npm (node package manager) installed on your computer, which is a package manager for javascript packages.

Testrpc being node based, we can now download it via the command line tool called Terminal in your utilities:

	npm install -g ethereumjs-testrpc


For Windows: 

Follow the instructions via this link below.
https://github.com/ethereumjs/testrpc/wiki/Installing-TestRPC-on-Windows


Assuming that testrpc is installed on your computer, we can now test the simulated blockchain network by running the following command inside your terminal:

	testrpc

Essentially, this is a simulation of the blockchain that runs directly on your computer. The next step is to install an environment that will facilitate the deployment of the contract, we use truffle:

https://truffle.readthedocs.io/en/latest/

