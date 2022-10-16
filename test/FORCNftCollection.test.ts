import { ethers, network, deployments, getNamedAccounts } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'

import { developmentChains } from '../helper-hardhat-config'
import { contractConfig, hiddenMetadataUri } from '../project-config'
import {
  FORCNftCollectionMock as MockContractType,
  FORCNftCollection as ContractType,
} from '../typechain-types'

const allowlistAddresses = [
  // Hardhat test addresses
  // '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // deployer
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // allowlistMinter
  // '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // publicMinter
  // '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // externalUser
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
  '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
  '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
  '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a',
  '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
  '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
  '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
  '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
  '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
  '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
  '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
]

function calcTotalMintWei(mintPrice: string, mintAmount: number) {
  return ethers.utils.parseEther(mintPrice).mul(mintAmount)
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe('FORCNftCollection Unit Test', function () {
      let deployer: SignerWithAddress,
        allowlistMinter: SignerWithAddress,
        publicMinter: SignerWithAddress,
        externalUser: SignerWithAddress,
        FORCNftCollectionMock: MockContractType,
        mockContractWithDeployer: MockContractType,
        mockContractWithAllowlistMinter: MockContractType,
        mockContractWithPublicMinter: MockContractType,
        mockContractWithExternalUser: MockContractType,
        FORCNftCollection: ContractType,
        contractWithDeployer: ContractType,
        contractWithAllowlistMinter: ContractType,
        contractWithPublicMinter: ContractType,
        contractWithExternalUser: ContractType

      before(async function () {
        await deployments.fixture(['mocks', 'FORCNftCollection'])
        // const { deployer } = await getNamedAccounts()
        const accounts = await ethers.getSigners()
        deployer = accounts[0]
        allowlistMinter = accounts[1]
        publicMinter = accounts[2]
        externalUser = accounts[3]

        FORCNftCollectionMock = await ethers.getContract('FORCNftCollectionMock')
        mockContractWithDeployer = FORCNftCollectionMock.connect(deployer)
        mockContractWithAllowlistMinter =
          FORCNftCollectionMock.connect(allowlistMinter)
        mockContractWithPublicMinter = FORCNftCollectionMock.connect(publicMinter)
        mockContractWithExternalUser = FORCNftCollectionMock.connect(externalUser)

        FORCNftCollection = await ethers.getContract('FORCNftCollection')
        contractWithDeployer = FORCNftCollection.connect(deployer)
        contractWithAllowlistMinter = FORCNftCollection.connect(allowlistMinter)
        contractWithPublicMinter = FORCNftCollection.connect(publicMinter)
        contractWithExternalUser = FORCNftCollection.connect(externalUser)
      })

      describe('constructor()', function () {
        it('initializes the FORCNftCollection contract correctly', async function () {
          assert.equal(await FORCNftCollection.getSaleState(), 0)
          assert.equal(
            (await FORCNftCollection.getMaxSupply()).toString(),
            contractConfig.maxSupply
          )
          assert.equal(
            (await FORCNftCollection.getMintPrice()).toString(),
            calcTotalMintWei(
              contractConfig.saleType.allowlistSale.mintPrice,
              1
            ).toString()
          )
          assert.equal(
            (await FORCNftCollection.getMaxMintAmountPerTx()).toString(),
            contractConfig.saleType.allowlistSale.maxMintAmountPerTx
          )
          assert.equal(
            await FORCNftCollection.getHiddenMetadataUri(),
            hiddenMetadataUri
          )
          assert.isFalse(await FORCNftCollection.getRevealed())

          await expect(FORCNftCollection.tokenURI(1)).to.be.revertedWith(
            'FORCNftCollection__NonexistentToken'
          )

          // The total supply of the mocked contract should be 99
          assert.equal(
            (await FORCNftCollectionMock.totalSupply()).toString(),
            '99'
          )
        })
      })

      describe('allowlistMint()', function () {
        let merkleTree: MerkleTree, rootHash: string

        before(async function () {
          // Construct Merkle Tree
          const leafNodes = allowlistAddresses.map((address) =>
            keccak256(address)
          )
          merkleTree = new MerkleTree(leafNodes, keccak256, {
            sortPairs: true,
          })
          rootHash = merkleTree.getHexRoot()

          // Update the root hash
          await FORCNftCollection.setMerkleRoot(rootHash)
        })

        it('returns the value of the root just set', async function () {
          assert.equal(await FORCNftCollection.getMerkleRoot(), rootHash)
        })

        it('reverts when sales are closed', async function () {
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__AllowlistSaleClosed')
        })

        it('reverts when public sale is open', async function () {
          // Set sale state to Public Open
          await FORCNftCollection.setPublicOpen()
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__AllowlistSaleClosed')
        })

        it('reverts if the mint amount is less than 1', async function () {
          // Set sale state to Allowlist Only
          await FORCNftCollection.setAllowlistOnly()
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              0,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  0
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__InvalidMintAmount')
        })

        it('reverts if the mint amount is greater than maximum amount', async function () {
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              6,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  6
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__InvalidMintAmount')
        })

        it('reverts if the maximum supply is exceeded when mint', async function () {
          // Use the FORCNftCollectionMock contract
          await expect(
            mockContractWithAllowlistMinter.allowlistMint(
              2,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  2
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__MaxSupplyExceeded')
        })

        it('reverts if insufficient funds are sent', async function () {
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ).sub(1),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__InsufficientFunds')
        })

        it('reverts if invalid proof is send', async function () {
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await externalUser.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__InvalidProof')
        })

        it('reverts if someone pretends to be an allowlisted user', async function () {
          await expect(
            contractWithExternalUser.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__InvalidProof')
        })

        it('reverts if no proof is sent', async function () {
          await expect(
            contractWithAllowlistMinter.allowlistMint(1, [], {
              value: calcTotalMintWei(
                contractConfig.saleType.allowlistSale.mintPrice,
                1
              ),
            })
          ).to.be.revertedWith('FORCNftCollection__InvalidProof')
        })

        it('emits event after mint', async function () {
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ),
              }
            )
          ).to.emit(FORCNftCollection, 'Mint')
        })

        it('reverts if the address is already claimed', async function () {
          // The second (and subsequent) claims should fail
          await expect(
            contractWithAllowlistMinter.allowlistMint(
              1,
              merkleTree.getHexProof(
                keccak256(await allowlistMinter.getAddress())
              ),
              {
                value: calcTotalMintWei(
                  contractConfig.saleType.allowlistSale.mintPrice,
                  1
                ),
              }
            )
          ).to.be.revertedWith('FORCNftCollection__AddressAlreadyClaimed')
        })
      })

      describe('publicMint()', function () {
        before(async function () {
          await FORCNftCollection.setMintPrice(
            ethers.utils.parseEther(
              contractConfig.saleType.publicSale.mintPrice
            )
          )
          await FORCNftCollection.setMaxMintAmountPerTx(
            contractConfig.saleType.publicSale.maxMintAmountPerTx
          )
        })

        it('reverts when allowlist sale is open', async function () {
          await expect(
            contractWithPublicMinter.publicMint(1, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                1
              ),
            })
          ).to.be.revertedWith('FORCNftCollection__PublicSaleClosed')
        })

        it('reverts when sales are closed', async function () {
          // Set sale state to Closed
          await FORCNftCollection.setClosed()
          await expect(
            contractWithPublicMinter.publicMint(1, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                1
              ),
            })
          ).to.be.revertedWith('FORCNftCollection__PublicSaleClosed')
        })

        it('reverts if the mint amount is less than 1', async function () {
          // Set sale state to Public Open
          await FORCNftCollection.setPublicOpen()
          await expect(
            contractWithPublicMinter.publicMint(0, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                0
              ),
            })
          ).to.be.revertedWith('FORCNftCollection__InvalidMintAmount')
        })

        it('reverts if the mint amount is greater than maximum amount', async function () {
          await expect(
            contractWithPublicMinter.publicMint(11, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                11
              ),
            })
          ).to.be.revertedWith('FORCNftCollection__InvalidMintAmount')
        })

        it('reverts if the maximum supply is exceeded when mint', async function () {
          // Use the FORCNftCollectionMock contract
          await expect(
            mockContractWithPublicMinter.publicMint(5, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                5
              ),
            })
          ).to.be.revertedWith('FORCNftCollection__MaxSupplyExceeded')
        })

        it('reverts if insufficient funds are sent', async function () {
          await expect(
            contractWithPublicMinter.publicMint(1, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                1
              ).sub(1),
            })
          ).to.be.revertedWith('FORCNftCollection__InsufficientFunds')
        })

        it('emits event after mint', async function () {
          await expect(
            contractWithPublicMinter.publicMint(1, {
              value: calcTotalMintWei(
                contractConfig.saleType.publicSale.mintPrice,
                1
              ),
            })
          ).to.emit(FORCNftCollection, 'Mint')
        })
      })

      describe('mintForAddress()', function () {
        it('reverts if the mint amount is less than 1', async function () {
          await expect(
            contractWithDeployer.mintForAddress(
              0,
              await externalUser.getAddress()
            )
          ).to.be.revertedWith('FORCNftCollection__InvalidMintAmount')
        })

        it('reverts if the mint amount is greater than maximum amount', async function () {
          await expect(
            contractWithDeployer.mintForAddress(
              11,
              await externalUser.getAddress()
            )
          ).to.be.revertedWith('FORCNftCollection__InvalidMintAmount')
        })

        it('reverts if the minter is not the deployer', async function () {
          await expect(
            contractWithExternalUser.mintForAddress(
              1,
              await externalUser.getAddress()
            )
          ).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it('can only be done if the minter is the deployer', async function () {
          assert(
            contractWithDeployer.mintForAddress(
              1,
              await externalUser.getAddress()
            )
          )
        })
      })

      describe('withdraw()', function () {
        it('reverts if you are not the deployer', async function () {
          await expect(contractWithExternalUser.withdraw()).to.be.revertedWith(
            'Ownable: caller is not the owner'
          )
        })

        it('can only be done if you are the deployer', async function () {
          assert(contractWithDeployer.withdraw())
        })
      })

      describe('Reveal collection', function () {
        it('returns hidden metadata URI before the collection is revealed', async function () {
          assert.equal(await FORCNftCollection.tokenURI(1), hiddenMetadataUri)
        })

        it('returns NFT metadata URI after the collection is revealed', async function () {
          const baseUri = 'ipfs://__COLLECTION_CID__/'
          await FORCNftCollection.setBaseUri(baseUri)
          await FORCNftCollection.setRevealed(true)
          assert.equal(await FORCNftCollection.getBaseUri(), baseUri)
          assert.equal(await FORCNftCollection.tokenURI(1), `${baseUri}1.json`)
        })
      })

      describe('Test setter and getter functions', function () {
        it('returns 1 when Allowlist Only is set', async function () {
          await FORCNftCollection.setAllowlistOnly()
          assert.equal(await FORCNftCollection.getSaleState(), 1)
        })

        it('returns 2 when Public Open is set', async function () {
          await FORCNftCollection.setPublicOpen()
          assert.equal(await FORCNftCollection.getSaleState(), 2)
        })

        it('returns 0 when Closed is set', async function () {
          await FORCNftCollection.setClosed()
          assert.equal(await FORCNftCollection.getSaleState(), 0)
        })

        it('returns the value of the mint price you set', async function () {
          const wei = ethers.utils.parseEther('1')
          await FORCNftCollection.setMintPrice(wei)
          assert.equal(
            (await FORCNftCollection.getMintPrice()).toString(),
            wei.toString()
          )
        })

        it('returns the value of the maximum mint amount you set', async function () {
          await FORCNftCollection.setMaxMintAmountPerTx(100)
          assert.equal(
            (await FORCNftCollection.getMaxMintAmountPerTx()).toString(),
            '100'
          )
        })

        it('returns the hidden metadata URI you set', async function () {
          const newUri = 'ipfs://__NEW_CID__/hidden.json'
          await FORCNftCollection.setHiddenMetadataUri(newUri)
          assert.equal(await FORCNftCollection.getHiddenMetadataUri(), newUri)
        })
      })
    })
