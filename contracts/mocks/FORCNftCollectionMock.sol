// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '../FORCNftCollection.sol';

/// @title A contract that mocked FORCNftCollection
/// @dev This mock has a maximum supply set to 100, and 99 tokens are automatically minted when deployed
contract FORCNftCollectionMock is FORCNftCollection {
    constructor(
        string memory nftName,
        string memory nftSymbol,
        string memory hiddenMetadataUri,
        uint256 maxSupply,
        uint256 mintPrice,
        uint256 maxMintAmountPerTx
    )
        FORCNftCollection(
            nftName,
            nftSymbol,
            hiddenMetadataUri,
            maxSupply,
            mintPrice,
            maxMintAmountPerTx
        )
    {
        _safeMint(owner(), 99);
    }
}
