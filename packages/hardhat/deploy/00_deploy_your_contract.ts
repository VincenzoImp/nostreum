import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployNostrLinkr: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("NostrLinkr", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const nostrLinkr = await hre.ethers.getContract<Contract>("NostrLinkr", deployer);
  console.log("NostrLinkr deployed at:", await nostrLinkr.getAddress());
};

export default deployNostrLinkr;

deployNostrLinkr.tags = ["NostrLinkr"];
