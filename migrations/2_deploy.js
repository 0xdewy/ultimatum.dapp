var Ultimatum = artifacts.require("./Ultimatum.sol");
// var StringUtils = artifacts.require("./StringUtils.sol");

module.exports = function(deployer) {
//     deployer.deploy(StringUtils);
//     deployer.link(StringUtils, Ultimatum);
    deployer.deploy(Ultimatum);
};
