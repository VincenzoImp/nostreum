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

        (string memory contentStr, string memory pubkeyStr) = _extractContentAndPubkey(message);
        
        // Convert string representations to proper types
        address addr = _parseAddress(contentStr);
        bytes32 pubkey = _parseBytes32(pubkeyStr);

        // Check if linkr already exists
        require(addressPubkey[addr] == bytes32(0), "Linkr already exists");
        require(pubkeyAddress[pubkey] == address(0), "Linkr already exists");

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

    // Helper function to parse address from string
    function _parseAddress(string memory addrStr) internal pure returns (address) {
        bytes memory addrBytes = bytes(addrStr);
        require(addrBytes.length == 42, "Invalid address length"); // 0x + 40 hex chars
        require(addrBytes[0] == '0' && addrBytes[1] == 'x', "Address must start with 0x");
        
        uint160 result = 0;
        for (uint i = 2; i < 42; i++) {
            result *= 16;
            uint8 digit = uint8(addrBytes[i]);
            if (digit >= 48 && digit <= 57) {
                result += digit - 48; // 0-9
            } else if (digit >= 65 && digit <= 70) {
                result += digit - 55; // A-F
            } else if (digit >= 97 && digit <= 102) {
                result += digit - 87; // a-f
            } else {
                revert("Invalid hex character in address");
            }
        }
        return address(result);
    }

    // Helper function to parse bytes32 from string
    function _parseBytes32(string memory hexStr) internal pure returns (bytes32) {
        bytes memory hexBytes = bytes(hexStr);
        require(hexBytes.length == 64, "Invalid bytes32 hex length"); // 64 hex chars for 32 bytes
        
        bytes32 result;
        for (uint i = 0; i < 64; i++) {
            uint8 digit = uint8(hexBytes[i]);
            uint8 value;
            if (digit >= 48 && digit <= 57) {
                value = digit - 48; // 0-9
            } else if (digit >= 65 && digit <= 70) {
                value = digit - 55; // A-F
            } else if (digit >= 97 && digit <= 102) {
                value = digit - 87; // a-f
            } else {
                revert("Invalid hex character in pubkey");
            }
            
            if (i % 2 == 0) {
                result |= bytes32(uint256(value) << (4 * (63 - i)));
            } else {
                result |= bytes32(uint256(value) << (4 * (63 - i)));
            }
        }
        return result;
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