// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NostrLinkr {
    using ECDSA for bytes32;

    address public owner;

    mapping(address => bytes32) public addressPubkey;
    mapping(bytes32 => address) public pubkeyAddress;

    event LinkrPushed(string message, bytes signature, address signer);
    event LinkrPulled(address indexed addr, bytes32 indexed pubkey);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function updateOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address not allowed");
        owner = newOwner;
    }

    function pushLinkr(string calldata message, bytes calldata signature, address signer) external {
    // Hash the original message
    bytes32 messageHash = keccak256(abi.encodePacked(message));

    // Ethereum Signed Message Hash
    bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

    // Recover signer using ECDSA
    address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

    require(recoveredSigner == signer, "Invalid signature");
    require(signer == owner, "Signer is not the contract owner");

    (address addr, bytes32 pubkey) = _extractContentAndPubkey(message);

    require(bytes(addressPubkey[addr]).length == 0, "Linkr already exists");
    require(bytes(pubkeyAddress[pubkey]).length == 0, "Linkr already exists");

    addressPubkey[addr] = pubkey;
    pubkeyAddress[pubkey] = addr;

    emit LinkrPushed(message, signature, signer);
}


    function pullLinkr() external onlyOwner {
        bytes32 pubkey = addressPubkey[msg.sender];
        delete addressPubkey[msg.sender];
        delete pubkeyAddress[pubkey];
        emit LinkrPulled(msg.sender, pubkey);
    }

    // Internal helper to extract "content" and "pubkey" from a JSON string
    function _extractContentAndPubkey(string memory json) internal pure returns (string memory content, string memory pubkey) {
        bytes memory b = bytes(json);
        require(b.length > 0, "Empty JSON input");

        bytes memory contentKey = bytes('"content":"');
        bytes memory pubkeyKey = bytes('"pubkey":"');

        uint contentStart = _indexOf(b, contentKey) + contentKey.length;
        uint contentEnd = _indexOfFrom(b, bytes('"'), contentStart);
        content = string(_slice(b, contentStart, contentEnd));

        uint pubkeyStart = _indexOf(b, pubkeyKey) + pubkeyKey.length;
        uint pubkeyEnd = _indexOfFrom(b, bytes('"'), pubkeyStart);
        pubkey = string(_slice(b, pubkeyStart, pubkeyEnd));
    }

    function _indexOf(bytes memory haystack, bytes memory needle) internal pure returns (uint) {
        return _indexOfFrom(haystack, needle, 0);
    }

    function _indexOfFrom(bytes memory haystack, bytes memory needle, uint start) internal pure returns (uint) {
        for (uint i = start; i <= haystack.length - needle.length; i++) {
            bool matchFound = true;
            for (uint j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    matchFound = false;
                    break;
                }
            }
            if (matchFound) return i;
        }
        revert("Key not found");
    }

    function _slice(bytes memory data, uint start, uint end) internal pure returns (bytes memory) {
        require(end >= start && end <= data.length, "Invalid slice range");
        bytes memory result = new bytes(end - start);
        for (uint i = 0; i < result.length; i++) {
            result[i] = data[start + i];
        }
        return result;
    }
}
