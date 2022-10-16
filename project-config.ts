import fs from 'fs'

const frontEndAbiFile = '../nextjs-nft-mint-dapp/config/abi.json'

const frontEndContractConfigFile =
  '../nextjs-nft-mint-dapp/config/contract-config.json'

const contractConfig = JSON.parse(
  fs.readFileSync(frontEndContractConfigFile, 'utf8')
)
const hiddenMetadataUri = '../hidden.json';//'ipfs://__CID__/hidden.json'

const frontEndAllowlistFile = '../nextjs-nft-mint-dapp/config/allowlist.json'

const allowlist = JSON.parse(fs.readFileSync(frontEndAllowlistFile, 'utf8'))

export {
  frontEndAbiFile,
  frontEndContractConfigFile,
  contractConfig,
  hiddenMetadataUri,
  allowlist,
}
