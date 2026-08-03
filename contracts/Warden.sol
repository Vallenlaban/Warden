// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Warden — Decentralized AI Phishing Defender & Community Reputation Database
/// @author WARDEN Web3 Security Core
/// @notice Implements an immutable ledger for Web3 threat reporting where AI analysis serves
///         as the canonical truth, augmented dynamically by transparent community security audits.
/// @dev Optimized for BOT Chain (EVM). Employs memory-efficient mappings and strict sybil protection 
///      to maintain low gas consumption during high-frequency execution.
contract Warden {

    /// @notice Structured container representing canonical AI analysis and community reporting metrics
    /// @dev Reordered to optimize storage slot packing. aiThreatScore and exists are packed into one slot.
    struct ThreatReport {
        bytes32 urlHash;           // Slot 0 (32 bytes)
        uint256 reportCount;       // Slot 1 (32 bytes)
        uint256 firstReportedAt;   // Slot 2 (32 bytes)
        uint256 lastReportedAt;    // Slot 3 (32 bytes)
        uint8 aiThreatScore;       // Slot 4 (1 byte)
        bool exists;               // Slot 4 (1 byte - packed with aiThreatScore)
        string aiStatus;           // Slot 5 (dynamic)
        string aiReason;           // Slot 6 (dynamic)
    }

    // Mapping from URL keccak256 hash to its master ThreatReport record
    mapping(bytes32 => ThreatReport) private _reports;

    // Mapping to track unique reports per wallet to mitigate sybil / double-reporting spam
    mapping(bytes32 => mapping(address => bool)) private _hasReported;

    /// @notice Emitted whenever a security threat is logged or dynamically amplified by the community
    /// @param urlHash The keccak256 hash representing the audited URL
    /// @param reporter The address of the wallet authorizing the security report
    /// @param aiThreatScore The canonical threat score, immutably preserved from the first record
    /// @param aiStatus The canonical status string, immutably preserved from the first record
    /// @param reportCount The incremented total count of unique reports for this threat profile
    /// @param timestamp The exact block timestamp at which the entry transaction was written to the ledger
    event ThreatReported(
        bytes32 indexed urlHash,
        address indexed reporter,
        uint8 aiThreatScore,
        string aiStatus,
        uint256 reportCount,
        uint256 timestamp
    );

    /// @notice Records a new security threat or increases the consensus count of an existing threat profile.
    /// @dev If the URL hash has never been registered, the incoming AI variables are written as canonical.
    ///      Subsequent calls from unique wallets bypass the string/int storage writes to conserve gas, 
    ///      simply incrementing the reporting metrics.
    /// @param urlHash Keccak256 hash of the scrutinized URL
    /// @param aiThreatScore Security severity value parsed from primary Gemini AI evaluation (0 to 100)
    /// @param aiStatus Primary Gemini AI assessment status (SAFE, WARNING, or DANGER)
    /// @param aiReason Short contextual summary provided by the Gemini AI evaluation engine
    function reportThreat(
        bytes32 urlHash,
        uint8 aiThreatScore,
        string calldata aiStatus,
        string calldata aiReason
    ) external {
        // Enforce basic threat value validation bounds
        require(urlHash != bytes32(0), "Warden: Invalid URL hash");
        require(aiThreatScore <= 100, "Warden: Invalid threat score");
        
        // Strict anti-spam constraint: each physical key/wallet can report a unique target exactly once
        require(!_hasReported[urlHash][msg.sender], "Warden: Wallet already reported this URL");

        // Mark address as spent for this specific URL state before storage updates
        _hasReported[urlHash][msg.sender] = true;

        ThreatReport storage report = _reports[urlHash];

        if (!report.exists) {
            // Validate incoming strings for initial canonical record initialization
            require(bytes(aiStatus).length > 0, "Warden: aiStatus cannot be empty");
            require(bytes(aiReason).length > 0, "Warden: aiReason cannot be empty");

            // Genesis Configuration: AI Analysis constitutes the canonical immutable truth
            report.urlHash = urlHash;
            report.aiThreatScore = aiThreatScore;
            report.aiStatus = aiStatus;
            report.aiReason = aiReason;
            report.reportCount = 1;
            report.firstReportedAt = block.timestamp;
            report.lastReportedAt = block.timestamp;
            report.exists = true;
        } else {
            // Community Amplification Phase: Do not overwrite canonical AI values!
            // Only update counts and interaction timestamps to conserve node memory and write fees.
            report.reportCount += 1;
            report.lastReportedAt = block.timestamp;
        }

        emit ThreatReported(
            urlHash,
            msg.sender,
            report.aiThreatScore,
            report.aiStatus,
            report.reportCount,
            block.timestamp
        );
    }

    /// @notice Returns the full threat report metadata for a specific URL hash
    /// @dev Designed intentionally to avoid revert states, returning an empty structure with `exists = false` 
    ///      to simplify frontend asynchronous state checking.
    /// @param urlHash Keccak256 hash of the scrutinized URL
    /// @return urlHash_ Returned unique hash identifier matching database entries
    /// @return aiThreatScore Canonical severity assessment
    /// @return aiStatus Canonical status state
    /// @return aiReason Canonical AI text reason
    /// @return reportCount Number of distinct reporter validations
    /// @return firstReportedAt Block timestamp of initial registration
    /// @return lastReportedAt Block timestamp of latest database modification
    /// @return exists_ Flag validating if the target URL has any transaction history in Warden
    function getThreat(bytes32 urlHash) external view returns (
        bytes32 urlHash_,
        uint8 aiThreatScore,
        string memory aiStatus,
        string memory aiReason,
        uint256 reportCount,
        uint256 firstReportedAt,
        uint256 lastReportedAt,
        bool exists_
    ) {
        ThreatReport memory report = _reports[urlHash];
        return (
            report.urlHash,
            report.aiThreatScore,
            report.aiStatus,
            report.aiReason,
            report.reportCount,
            report.firstReportedAt,
            report.lastReportedAt,
            report.exists
        );
    }

    /// @notice Retrieves the total number of unique reports submitted for a URL hash
    /// @param urlHash Keccak256 hash of the scrutinized URL
    /// @return The cumulative report count
    function getReportCount(bytes32 urlHash) external view returns (uint256) {
        return _reports[urlHash].reportCount;
    }

    /// @notice Checks if a specific wallet address has already submitted a report for a URL hash
    /// @param urlHash Keccak256 hash of the scrutinized URL
    /// @param wallet The address of the reporter to query
    /// @return True if the wallet has already reported this URL, false otherwise
    function hasReported(bytes32 urlHash, address wallet) external view returns (bool) {
        return _hasReported[urlHash][wallet];
    }

    /// @notice Confirms whether a threat profile exists inside the Warden registry database
    /// @param urlHash Keccak256 hash of the scrutinized URL
    /// @return True if the URL hash has at least one recorded entry, false otherwise
    function exists(bytes32 urlHash) external view returns (bool) {
        return _reports[urlHash].exists;
    }
}