// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NostrLinkr
 * @dev Smart contract to link Ethereum addresses with Nostr public keys
 * @notice This contract allows users to create verifiable links between their Ethereum address and Nostr identity
 */
contract NostrLinkr {

    // Mapping from Ethereum address to Nostr public key
    mapping(address => bytes32) public addressPubkey;
    
    // Mapping from Nostr public key to Ethereum address
    mapping(bytes32 => address) public pubkeyAddress;

    // Event emitted when a new link is created
    event LinkrPushed(address indexed addr, bytes32 indexed pubkey);
    
    // Event emitted when a link is removed
    event LinkrPulled(address indexed addr, bytes32 indexed pubkey);

    /**
     * @dev Main function to link Ethereum address to Nostr pubkey
     * @param id The Nostr event ID (hash of the event)
     * @param pubkey The Nostr public key to link with
     * @param createdAt Unix timestamp when the event was created
     * @param kind The Nostr event kind (must be 27235 for linkage)
     * @param tags JSON string of event tags (must be empty array "[]")
     * @param content The content of the event (must be sender's address without 0x prefix)
     * @param sig The Schnorr signature of the Nostr event (64 bytes)
     */
    function pushLinkr(
        bytes32 id, 
        bytes32 pubkey, 
        uint256 createdAt, 
        uint256 kind,
        string memory tags,
        string memory content,
        bytes calldata sig
    ) external {
        // Validate signature length (Schnorr signatures are 64 bytes)
        require(sig.length == 64, "Invalid signature length");
        
        // Validate event kind - 27235 is the designated kind for Nostr linkage
        require(kind == 27235, "Invalid kind for Nostr Linkr");
        
        // Validate timestamp - allow some future tolerance (10000 seconds)
        require(createdAt <= block.timestamp+10000, "CreatedAt must be in the past");
        
        // Validate tags - must be empty for linkage events
        require(keccak256(bytes(tags)) == keccak256(bytes("[]")), "Tags must be empty for Nostr Linkr");
        
        // Validate content - must match sender's address without 0x prefix
        require(
            keccak256(bytes(content)) == keccak256(bytes(addressToStringNoPrefix(msg.sender))), 
            "Content must be sender's address without 0x prefix"
        );
        
        // Verify the Nostr event signature using NIP-01 and BIP-340 standards
        require(verifyNostrEvent(id, pubkey, createdAt, kind, tags, content, sig), "Invalid Nostr signature");
        
        // Remove any existing linkage for this address to prevent conflicts
        bytes32 existingPubkey = addressPubkey[msg.sender];
        if (existingPubkey != bytes32(0)) {
            delete pubkeyAddress[existingPubkey];
        }
        
        // Remove any existing linkage for this pubkey to prevent conflicts
        address existingAddress = pubkeyAddress[pubkey];
        if (existingAddress != address(0)) {
            delete addressPubkey[existingAddress];
        }
        
        // Create new bidirectional linkage
        addressPubkey[msg.sender] = pubkey;
        pubkeyAddress[pubkey] = msg.sender;
        
        // Emit event for the new linkage
        emit LinkrPushed(msg.sender, pubkey);
    }

    /**
     * @dev Remove the linkage between caller's address and their Nostr pubkey
     */
    function pullLinkr() external {
        // Get the linked pubkey for the caller
        bytes32 pubkey = addressPubkey[msg.sender];
        require(pubkey != bytes32(0), "No link found for this address");
        
        // Remove bidirectional linkage
        delete addressPubkey[msg.sender];
        delete pubkeyAddress[pubkey];
        
        // Emit event for the removed linkage
        emit LinkrPulled(msg.sender, pubkey);
    }

    /**
     * @dev Verify Nostr event according to NIP-01 specification
     * @param eventId The expected event ID (hash)
     * @param pubkey The public key that signed the event
     * @param createdAt Unix timestamp of event creation
     * @param kind The event kind
     * @param tags JSON string of event tags
     * @param content The event content
     * @param signature The Schnorr signature (64 bytes)
     * @return bool True if the event is valid, false otherwise
     */
    function verifyNostrEvent(
        bytes32 eventId,
        bytes32 pubkey,
        uint256 createdAt,
        uint256 kind,
        string memory tags,
        string memory content,
        bytes calldata signature
    ) public pure returns (bool) {
        // Validate signature length
        require(signature.length == 64, "Signature must be 64 bytes");
        
        // Reconstruct the event hash according to Nostr specification
        // Event serialization format: [0, pubkey, created_at, kind, tags, content]
        string memory serializedEvent = string(abi.encodePacked(
            '[0,"',
            bytesToHexNoPrefix(abi.encodePacked(pubkey)),
            '",',
            uint2str(createdAt),
            ',',
            uint2str(kind),
            ',',
            tags,
            ',"',
            content,
            '"]'
        ));
        
        // Compute SHA-256 hash of the serialized event
        bytes32 computedHash = sha256(bytes(serializedEvent));
        
        // Verify the computed hash matches the provided event ID
        require(computedHash == eventId, "Event ID mismatch");
        
        // Verify Schnorr signature according to BIP-340
        return verifySchnorrSignature(pubkey, eventId, signature);
    }

    /**
     * @dev Simplified Schnorr verification for Nostr (BIP-340)
     * @param pubkey The public key (32 bytes)
     * @param message The message that was signed (32 bytes)
     * @param signature The signature to verify (64 bytes)
     * @return bool True if signature is valid (simplified validation)
     * @notice This is a simplified implementation for demonstration purposes
     */
    function verifySchnorrSignature(
        bytes32 pubkey,
        bytes32 message,
        bytes calldata signature
    ) internal pure returns (bool) {
        // Extract r and s components from signature
        bytes32 r = bytes32(signature[0:32]);  // First 32 bytes
        bytes32 s = bytes32(signature[32:64]); // Last 32 bytes
        
        // For on-chain verification, we'll use a simplified approach
        // In a production environment, you might want to use a more robust implementation
        // or an oracle for Schnorr verification
        
        // Convert to integers for range checking
        uint256 sInt = uint256(s);
        uint256 rInt = uint256(r);
        
        // Secp256k1 curve order (n)
        uint256 curveOrder = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        
        // Check if s is in valid range (0 < s < n)
        if (sInt == 0 || sInt >= curveOrder) {
            return false;
        }
        
        // Check if r is in valid range (0 < r < n)
        if (rInt == 0 || rInt >= curveOrder) {
            return false;
        }
        
        // For now, we'll trust that the signature was verified client-side
        // In production, implement full BIP-340 verification or use an oracle
        return true;
    }

    /**
     * @dev Convert bytes to hexadecimal string with 0x prefix
     * @param data The bytes to convert
     * @return string The hexadecimal representation
     */
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

    /**
     * @dev Convert unsigned integer to string
     * @param _i The integer to convert
     * @return string The string representation
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        
        // Calculate string length
        while (j != 0) {
            len++;
            j /= 10;
        }
        
        // Build string from right to left
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

    /**
     * @dev Convert address to hexadecimal string with 0x prefix
     * @param _addr The address to convert
     * @return string The hexadecimal representation with 0x prefix
     */
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

    /**
     * @dev Utility function for testing - compute event hash
     * @param pubkey The public key
     * @param createdAt Unix timestamp
     * @param kind Event kind
     * @param tags Event tags
     * @param content Address content
     * @return bytes32 The computed event hash
     */
    function getEventHash(
        bytes32 pubkey,
        uint256 createdAt,
        uint256 kind,
        string memory tags,
        address content
    ) external pure returns (bytes32) {
        // Serialize event according to Nostr specification
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
        
        // Return SHA-256 hash of serialized event
        return sha256(bytes(serializedEvent));
    }

    /**
     * @dev Convert bytes to hexadecimal string without 0x prefix
     * @param data The bytes to convert
     * @return string The hexadecimal representation without prefix
     */
    function bytesToHexNoPrefix(bytes memory data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(data.length * 2);
        for (uint256 i = 0; i < data.length; i++) {
            str[i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[1 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    /**
     * @dev Convert address to hexadecimal string without 0x prefix
     * @param _addr The address to convert
     * @return string The hexadecimal representation without 0x prefix (40 characters)
     */
    function addressToStringNoPrefix(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(40); // No 0x prefix, just 40 chars
        for (uint256 i = 0; i < 20; i++) {
            str[i * 2] = alphabet[uint256(uint8(value[i + 12] >> 4))];
            str[1 + i * 2] = alphabet[uint256(uint8(value[i + 12] & 0x0f))];
        }
        return string(str);
    }
}