// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract NostrLinkr {
    event LinkCreated(address indexed ethAddress, string nostrPubKey);

    mapping(address => string) public nostrLinks;

    function linkNostr(string calldata nostrPubKey, bytes calldata signature) external {
        // Costruiamo il messaggio da firmare (es. "Link Ethereum <address> with Nostr <pubKey>")
        bytes32 messageHash = keccak256(
            abi.encodePacked("Link Ethereum ", toAsciiString(msg.sender), " with Nostr ", nostrPubKey)
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        // Recupera l'indirizzo che ha firmato la hash
        address signer = recoverSigner(ethSignedMessageHash, signature);

        // Controlla che l'indirizzo firmatario corrisponda al msg.sender
        require(signer == msg.sender, "Invalid signature");

        nostrLinks[msg.sender] = nostrPubKey;
        emit LinkCreated(msg.sender, nostrPubKey);
    }

    function getNostrLink(address user) public view returns (string memory) {
        return nostrLinks[user];
    }

    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        // EIP-191 signature
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

        // Ethereum v value is either 27 or 28
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
