// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NostrLinkr
 * @dev Smart contract to link Ethereum addresses with Nostr public keys
 * @notice This contract allows users to create verifiable links between their Ethereum address and Nostr identity
 */
contract NostrLinkr is Ownable, Pausable {

    // Mapping from Ethereum address to Nostr public key
    mapping(address => bytes32) public addressPubkey;

    // Mapping from Nostr public key to Ethereum address
    mapping(bytes32 => address) public pubkeyAddress;

    // Event emitted when a new link is created
    event LinkrPushed(address indexed addr, bytes32 indexed pubkey);

    // Event emitted when a link is removed
    event LinkrPulled(address indexed addr, bytes32 indexed pubkey);

    // Secp256k1 curve constants
    uint256 private constant CURVE_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
    uint256 private constant FIELD_PRIME = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    uint256 private constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 private constant GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;

    // Maximum future timestamp tolerance (5 minutes)
    uint256 private constant MAX_FUTURE_TOLERANCE = 300;
    // Maximum past timestamp tolerance (1 hour)
    uint256 private constant MAX_PAST_TOLERANCE = 3600;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Pause the contract - only owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract - only owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

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
    ) external whenNotPaused {
        // Validate signature length (Schnorr signatures are 64 bytes)
        require(sig.length == 64, "Invalid signature length");

        // Validate event kind - 27235 is the designated kind for Nostr linkage
        require(kind == 27235, "Invalid kind for Nostr Linkr");

        // Validate timestamp - allow 5 minutes future tolerance
        require(createdAt <= block.timestamp + MAX_FUTURE_TOLERANCE, "CreatedAt too far in the future");

        // Validate timestamp - reject events older than 1 hour
        require(createdAt >= block.timestamp - MAX_PAST_TOLERANCE, "CreatedAt too far in the past");

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
    ) public view returns (bool) {
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
     * @dev BIP-340 Schnorr signature verification
     * @param pubkey The x-coordinate of the public key (32 bytes)
     * @param message The message hash that was signed (32 bytes)
     * @param signature The signature to verify (64 bytes: r || s)
     * @return bool True if signature is valid
     *
     * Implements the BIP-340 verification algorithm:
     * 1. Lift the x-only pubkey to a full curve point P
     * 2. Compute challenge e = tagged_hash("BIP0340/challenge", r || P || m)
     * 3. Verify that s*G == R + e*P
     *
     * Uses the MODEXP precompile (address 0x05) for modular arithmetic.
     */
    function verifySchnorrSignature(
        bytes32 pubkey,
        bytes32 message,
        bytes calldata signature
    ) internal view returns (bool) {
        // Extract r and s components from signature
        uint256 r = uint256(bytes32(signature[0:32]));
        uint256 s = uint256(bytes32(signature[32:64]));

        // Validate r < field prime and s < curve order
        if (r >= FIELD_PRIME) return false;
        if (s >= CURVE_ORDER) return false;

        // Lift x-only public key to curve point P = (px, py) where py is even
        uint256 px = uint256(pubkey);
        if (px >= FIELD_PRIME) return false;

        // Compute py from px: py^2 = px^3 + 7 (mod p)
        uint256 py = liftX(px);
        if (py == 0) return false;

        // Ensure py is even (BIP-340 convention)
        if (py % 2 != 0) {
            py = FIELD_PRIME - py;
        }

        // Compute BIP-340 challenge: e = int(tagged_hash("BIP0340/challenge", r || pubkey || message)) mod n
        bytes32 challengeTag = sha256("BIP0340/challenge");
        uint256 e = uint256(sha256(abi.encodePacked(
            challengeTag,
            challengeTag,
            bytes32(r),
            pubkey,
            message
        ))) % CURVE_ORDER;

        // Verify: s*G == R + e*P
        // This is equivalent to checking that s*G - e*P has x-coordinate == r and even y

        // Compute s*G
        (uint256 sgx, uint256 sgy) = ecMul(GX, GY, s);

        // Compute e*P
        (uint256 epx, uint256 epy) = ecMul(px, py, e);

        // Compute R = s*G - e*P = s*G + (-e*P)
        // Negate epy for subtraction
        uint256 negEpy = FIELD_PRIME - epy;
        (uint256 rx, uint256 ry) = ecAdd(sgx, sgy, epx, negEpy);

        // Check R is not point at infinity
        if (rx == 0 && ry == 0) return false;

        // Check R.x == r
        if (rx != r) return false;

        // Check R.y is even (BIP-340 requirement)
        if (ry % 2 != 0) return false;

        return true;
    }

    /**
     * @dev Lift x-coordinate to curve point (compute y from x on secp256k1)
     * @param x The x-coordinate
     * @return y The y-coordinate (positive root), or 0 if x is not on the curve
     */
    function liftX(uint256 x) internal view returns (uint256) {
        // y^2 = x^3 + 7 (mod p)
        uint256 ySquared = addmod(mulmod(mulmod(x, x, FIELD_PRIME), x, FIELD_PRIME), 7, FIELD_PRIME);

        // Compute square root using Euler's criterion: y = ySquared^((p+1)/4) mod p
        // This works because p ≡ 3 (mod 4) for secp256k1
        uint256 y = modExp(ySquared, (FIELD_PRIME + 1) / 4, FIELD_PRIME);

        // Verify the result
        if (mulmod(y, y, FIELD_PRIME) != ySquared) return 0;

        return y;
    }

    /**
     * @dev Modular exponentiation using the MODEXP precompile (address 0x05)
     */
    function modExp(uint256 base, uint256 exponent, uint256 modulus) internal view returns (uint256 result) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x20)           // base length
            mstore(add(ptr, 0x20), 0x20) // exponent length
            mstore(add(ptr, 0x40), 0x20) // modulus length
            mstore(add(ptr, 0x60), base)
            mstore(add(ptr, 0x80), exponent)
            mstore(add(ptr, 0xa0), modulus)

            // Call MODEXP precompile at address 0x05
            if iszero(staticcall(gas(), 0x05, ptr, 0xc0, ptr, 0x20)) {
                revert(0, 0)
            }
            result := mload(ptr)
        }
    }

    /**
     * @dev Elliptic curve point multiplication using double-and-add
     * @param x X-coordinate of the point
     * @param y Y-coordinate of the point
     * @param scalar The scalar to multiply by
     * @return rx X-coordinate of the result
     * @return ry Y-coordinate of the result
     */
    function ecMul(uint256 x, uint256 y, uint256 scalar) internal view returns (uint256 rx, uint256 ry) {
        if (scalar == 0) return (0, 0);

        rx = 0;
        ry = 0;
        uint256 qx = x;
        uint256 qy = y;

        while (scalar > 0) {
            if (scalar & 1 == 1) {
                if (rx == 0 && ry == 0) {
                    rx = qx;
                    ry = qy;
                } else {
                    (rx, ry) = ecAdd(rx, ry, qx, qy);
                }
            }
            (qx, qy) = ecAdd(qx, qy, qx, qy); // Point doubling
            scalar >>= 1;
        }
    }

    /**
     * @dev Elliptic curve point addition (affine coordinates)
     * @return rx X-coordinate of the result
     * @return ry Y-coordinate of the result
     */
    function ecAdd(uint256 x1, uint256 y1, uint256 x2, uint256 y2) internal view returns (uint256 rx, uint256 ry) {
        // Point at infinity handling
        if (x1 == 0 && y1 == 0) return (x2, y2);
        if (x2 == 0 && y2 == 0) return (x1, y1);

        uint256 lambda;

        if (x1 == x2) {
            if (y1 != y2) {
                // Points are inverses, return point at infinity
                return (0, 0);
            }
            // Point doubling: lambda = (3 * x1^2) / (2 * y1) mod p
            if (y1 == 0) return (0, 0);
            uint256 numerator = mulmod(3, mulmod(x1, x1, FIELD_PRIME), FIELD_PRIME);
            uint256 denominator = mulmod(2, y1, FIELD_PRIME);
            lambda = mulmod(numerator, modInverse(denominator, FIELD_PRIME), FIELD_PRIME);
        } else {
            // Point addition: lambda = (y2 - y1) / (x2 - x1) mod p
            uint256 numerator = addmod(y2, FIELD_PRIME - y1, FIELD_PRIME);
            uint256 denominator = addmod(x2, FIELD_PRIME - x1, FIELD_PRIME);
            lambda = mulmod(numerator, modInverse(denominator, FIELD_PRIME), FIELD_PRIME);
        }

        // rx = lambda^2 - x1 - x2 mod p
        rx = addmod(mulmod(lambda, lambda, FIELD_PRIME), FIELD_PRIME - addmod(x1, x2, FIELD_PRIME), FIELD_PRIME);

        // ry = lambda * (x1 - rx) - y1 mod p
        ry = addmod(mulmod(lambda, addmod(x1, FIELD_PRIME - rx, FIELD_PRIME), FIELD_PRIME), FIELD_PRIME - y1, FIELD_PRIME);
    }

    /**
     * @dev Modular inverse using Fermat's little theorem: a^(-1) = a^(p-2) mod p
     */
    function modInverse(uint256 a, uint256 modulus) internal view returns (uint256) {
        return modExp(a, modulus - 2, modulus);
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
     * @dev Utility function for testing - compute event hash
     * @param pubkey The public key
     * @param createdAt Unix timestamp
     * @param kind Event kind
     * @param tags Event tags
     * @param content Address content (without 0x prefix)
     * @return bytes32 The computed event hash
     */
    function getEventHash(
        bytes32 pubkey,
        uint256 createdAt,
        uint256 kind,
        string memory tags,
        string memory content
    ) external pure returns (bytes32) {
        // Serialize event according to Nostr specification (no 0x prefixes)
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
        bytes memory str = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            str[i * 2] = alphabet[uint256(uint8(value[i + 12] >> 4))];
            str[1 + i * 2] = alphabet[uint256(uint8(value[i + 12] & 0x0f))];
        }
        return string(str);
    }
}
