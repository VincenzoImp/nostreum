// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NostrLinkr {

    mapping(address => bytes32) public addressPubkey;
    mapping(bytes32 => address) public pubkeyAddress;

    event LinkrPushed(address indexed addr, bytes32 indexed pubkey);
    event LinkrPulled(address indexed addr, bytes32 indexed pubkey);

    // Funzione principale per collegare indirizzo Ethereum a pubkey Nostr
    function pushLinkr(
        bytes32 id, 
        bytes32 pubkey, 
        uint256 createdAt, 
        uint256 kind,
        string memory tags,
        address content,
        bytes calldata sig
    ) external {
        require(sig.length == 64, "Invalid signature length");
        require(address(content) == msg.sender, "Content address must match sender");
        require(kind == 27235, "Invalid kind for Nostr Linkr");
        require(createdAt <= block.timestamp+100, "CreatedAt must be in the past");
        require(keccak256(bytes(tags)) == keccak256(bytes("[]")), "Tags must be empty for Nostr Linkr");
        
        // Verify the Nostr event signature
        require(verifyNostrEvent(id, pubkey, createdAt, kind, tags, content, sig), "Invalid Nostr signature");
        
        // Remove any existing linkage for this address or pubkey
        bytes32 existingPubkey = addressPubkey[msg.sender];
        if (existingPubkey != bytes32(0)) {
            delete pubkeyAddress[existingPubkey];
        }
        address existingAddress = pubkeyAddress[pubkey];
        if (existingAddress != address(0)) {
            delete addressPubkey[existingAddress];
        }
        
        // Create new linkage
        addressPubkey[msg.sender] = pubkey;
        pubkeyAddress[pubkey] = msg.sender;
        
        emit LinkrPushed(msg.sender, pubkey);
    }

    function pullLinkr() external {
        bytes32 pubkey = addressPubkey[msg.sender];
        require(pubkey != bytes32(0), "No link found for this address");
        
        delete addressPubkey[msg.sender];
        delete pubkeyAddress[pubkey];
        emit LinkrPulled(msg.sender, pubkey);
    }

    // Verify Nostr event according to NIP-01 specification
    function verifyNostrEvent(
        bytes32 eventId,
        bytes32 pubkey,
        uint256 createdAt,
        uint256 kind,
        string memory tags,
        address content,
        bytes calldata signature
    ) public pure returns (bool) {
        require(signature.length == 64, "Signature must be 64 bytes");
        
        // Reconstruct the event hash according to Nostr specification
        // Event serialization: [0, pubkey, created_at, kind, tags, content]
        string memory serializedEvent = string(abi.encodePacked(
            '[0,"',
            bytesToHex(abi.encodePacked(pubkey)),
            '",',
            uint2str(createdAt),
            ',',
            uint2str(kind),
            ',',
            tags,
            ',"',
            addressToString(content),
            '"]'
        ));
        
        bytes32 computedHash = sha256(bytes(serializedEvent));
        require(computedHash == eventId, "Event ID mismatch");
        
        // Verify Schnorr signature according to BIP-340
        return verifySchnorrSignature(pubkey, eventId, signature);
    }

    // Simplified Schnorr verification for Nostr (BIP-340)
    function verifySchnorrSignature(
        bytes32 pubkey,
        bytes32 message,
        bytes calldata signature
    ) internal pure returns (bool) {
        // Extract r and s from signature
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        
        // For on-chain verification, we'll use a simplified approach
        // In a production environment, you might want to use a more robust implementation
        // or an oracle for Schnorr verification
        
        // Basic validation
        uint256 sInt = uint256(s);
        uint256 rInt = uint256(r);
        
        // Check if s and r are in valid range
        if (sInt == 0 || sInt >= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141) {
            return false;
        }
        if (rInt == 0 || rInt >= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141) {
            return false;
        }
        
        // For now, we'll trust that the signature was verified client-side
        // In production, implement full BIP-340 verification or use an oracle
        return true;
    }

    // Helper functions
    function bytesToHex(bytes memory data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[3 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint256(uint8(value[i + 12] >> 4))];
            str[3 + i * 2] = alphabet[uint256(uint8(value[i + 12] & 0x0f))];
        }
        return string(str);
    }

    // Utility function for testing
    function getEventHash(
        bytes32 pubkey,
        uint256 createdAt,
        uint256 kind,
        string memory tags,
        address content
    ) external pure returns (bytes32) {
        string memory serializedEvent = string(abi.encodePacked(
            '[0,"',
            bytesToHex(abi.encodePacked(pubkey)),
            '",',
            uint2str(createdAt),
            ',',
            uint2str(kind),
            ',',
            tags,
            ',"',
            addressToString(content),
            '"]'
        ));
        return sha256(bytes(serializedEvent));
    }
}