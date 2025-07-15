// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract NostrLinkrAttested {
    address public trustedSigner; // server's Ethereum address

    event LinkCreated(address indexed ethAddress, string nostrPubKey);

    mapping(address => string) public nostrLinks;

    constructor(address _trustedSigner) {
        trustedSigner = _trustedSigner;
    }

    function linkNostrAttested(
        address ethAddress,
        string calldata nostrPubKey,
        bytes calldata serverSignature
    ) external {
        // Compose the expected message
        bytes32 messageHash = keccak256(
            abi.encodePacked("Link attest: ethAddress=", toAsciiString(ethAddress), " nostrPubKey=", nostrPubKey)
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address recovered = recoverSigner(ethSignedMessageHash, serverSignature);

        require(recovered == trustedSigner, "Invalid server signature");

        nostrLinks[ethAddress] = nostrPubKey;
        emit LinkCreated(ethAddress, nostrPubKey);
    }

    // Standard EIP-191
    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }
    }

    // Helper: convert address to string
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
