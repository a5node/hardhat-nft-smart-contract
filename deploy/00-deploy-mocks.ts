import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers, network } from 'hardhat'

import { developmentChains } from '../helper-hardhat-config'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (developmentChains.includes(network.name)) {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    const nftName = 'FORCNftCollection'
    const nftSymbol = 'FORC'
    const hiddenMetadataUri = '../hidden.json';//'ipfs://__CID__/hidden.json'
    const maxSupply = 100
    const mintPrice = ethers.utils.parseEther('0.02')
    const maxMintAmountPerTx = 5

    const args = [
      nftName,
      nftSymbol,
      hiddenMetadataUri,
      maxSupply,
      mintPrice,
      maxMintAmountPerTx,
    ]

    await deploy('FORCNftCollectionMock', {
      from: deployer,
      args: args,
      log: true,
    })
  }
}
export default func
func.tags = ['mocks']
