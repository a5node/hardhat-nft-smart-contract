import { ethers, network } from 'hardhat'
import fs from 'fs'

import {
  frontEndAbiFile,
  frontEndContractConfigFile,
  contractConfig,
} from '../project-config'

const contractName = contractConfig.contractName
const contractAddresses = contractConfig.contractAddresses

async function updateAbi() {
  const FORCNftCollection = await ethers.getContract(contractName)

  fs.writeFileSync(
    frontEndAbiFile,
    FORCNftCollection.interface.format(ethers.utils.FormatTypes.json) as string
  )
}

async function updateContractAddresses() {
  const FORCNftCollection = await ethers.getContract(contractName)

  if (network.config.chainId) {
    if (network.config.chainId.toString() in contractAddresses) {
      if (
        !contractAddresses[network.config.chainId.toString()].includes(
          FORCNftCollection.address
        )
      ) {
        contractAddresses[network.config.chainId.toString()].push(
          FORCNftCollection.address
        )
      }
    } else {
      contractAddresses[network.config.chainId.toString()] = [
        FORCNftCollection.address,
      ]
    }
    fs.writeFileSync(frontEndContractConfigFile, JSON.stringify(contractConfig))
  }
}

async function updateFrontEnd() {
  if (process.env.UPDATE_FRONT_END === 'true') {
    console.log('Writing to front end...')
    await updateAbi()
    await updateContractAddresses()
    console.log('Front end written!')
  }
}
export default updateFrontEnd
updateFrontEnd.tags = ['updateFrontEnd']
