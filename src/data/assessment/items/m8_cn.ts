import type { AssessmentItem } from '../../../types';

/**
 * M8: CN Concepts & Scenarios
 * 6 items, 10 minutes budget
 * Difficulty: 2 easy (diff 1-2), 2 medium (diff 3), 2 hard (diff 4)
 * Formats: MCQ, scenario
 */
export const M8_CN_ITEMS: AssessmentItem[] = [
  // --- Easy Items (2 items: 1 diff 1, 1 diff 2) ---
  {
    id: 'asm-cn-001',
    domainId: 'cn',
    topicId: 'prep-cn',
    competency: 'cs-concept-gap',
    difficulty: 1,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Which protocol layer in the 7-layer OSI model is responsible for logical IP addressing, packet forwarding, and path selection across internetworks?',
    options: [
      'Network Layer (Layer 3)',
      'Data Link Layer (Layer 2)',
      'Transport Layer (Layer 4)',
      'Session Layer (Layer 5)'
    ],
    key: 0,
    explanation: 'The Network layer (Layer 3) handles logical host addressing (IPv4/IPv6), routing protocols, and packet forwarding across separate subnetworks.',
    errorCategories: ['E-CONCEPT', 'cs-concept-gap'],
    origin: 'assessment',
  },
  {
    id: 'asm-cn-002',
    domainId: 'cn',
    topicId: 'prep-cn',
    competency: 'cs-terminology',
    difficulty: 2,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'anchor',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'What is the sequence of control packets exchanged between a client and a server to establish a reliable TCP connection?',
    options: [
      'SYN -> SYN-ACK -> ACK',
      'SYN -> ACK -> SYN-ACK',
      'ACK -> SYN -> ACK',
      'FIN -> ACK -> FIN-ACK'
    ],
    key: 0,
    explanation: 'The TCP three-way handshake initiates with the client sending a SYN packet, the server answering with SYN-ACK, and the client acknowledging with an ACK packet before application data flows.',
    errorCategories: ['E-TERM', 'cs-terminology'],
    origin: 'assessment',
  },

  // --- Medium Items (2 items: diff 3) ---
  {
    id: 'asm-cn-003',
    domainId: 'cn',
    topicId: 'prep-cn',
    competency: 'cs-scenario-reasoning',
    difficulty: 3,
    estimatedMinutes: 1.5,
    questionType: 'scenario',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Scenario: A client attempts to connect to `https://api.example.com`. With no cached DNS entry, what recursive/iterative protocol chain resolves the host to an IP address?',
    options: [
      'Local Recursive Resolver queries Root Nameserver -> TLD Nameserver (.com) -> Authoritative Nameserver (example.com)',
      'ARP broadcast packet broadcast across the global Internet',
      'BGP peer advertisement querying Tier-1 backbone routers',
      'DHCP discover packet sent to the default gateway'
    ],
    key: 0,
    explanation: 'DNS resolution traverses the hierarchy: the recursive resolver queries a root DNS server, which delegates to the .com TLD server, which in turn points to the authoritative nameserver for example.com to retrieve the A/AAAA record.',
    errorCategories: ['E-CONCEPT', 'cs-scenario-reasoning'],
    origin: 'assessment',
  },
  {
    id: 'asm-cn-004',
    domainId: 'cn',
    topicId: 'prep-cn',
    competency: 'cs-application',
    difficulty: 3,
    estimatedMinutes: 1.5,
    questionType: 'mcq',
    assessmentRole: 'branch',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Why does HTTP/2 multiplexing over a single TCP stream experience Head-of-Line (HoL) blocking on lossy networks, and how does HTTP/3 overcome it?',
    options: [
      'A single lost TCP packet stalls all multiplexed streams in HTTP/2; HTTP/3 runs over UDP-based QUIC where streams are independent',
      'HTTP/2 limits streams to 4 concurrent connections; HTTP/3 expands to 1024 streams',
      'HTTP/2 encrypts headers with slow RSA keys; HTTP/3 replaces encryption with hashing',
      'TCP does not support binary framing; HTTP/3 reverts to plain text formats'
    ],
    key: 0,
    explanation: 'In HTTP/2, all requests share a single TCP connection. When a packet drops, TCP pauses all data delivery until the missing segment is retransmitted. HTTP/3 uses QUIC (over UDP), isolating streams so loss in one stream does not block others.',
    errorCategories: ['E-CONCEPT', 'cs-application'],
    origin: 'assessment',
  },

  // --- Hard Items (2 items: diff 4) ---
  {
    id: 'asm-cn-005',
    domainId: 'cn',
    topicId: 'prep-cn',
    competency: 'cs-scenario-reasoning',
    difficulty: 4,
    estimatedMinutes: 2,
    questionType: 'scenario',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'Scenario: In an established TCP connection, the sender receives 3 duplicate ACKs for packet sequence number 4000. How does TCP congestion control handle this under Fast Retransmit and Fast Recovery?',
    options: [
      'Immediately retransmits packet 4000 without waiting for the retransmission timeout, sets ssthresh = cwnd / 2, inflates cwnd for duplicate ACKs, and enters Fast Recovery',
      'Resets cwnd to 1 MSS and restarts Slow Start from 0',
      'Terminates the TCP connection with a RST packet',
      'Doubles cwnd exponentially to overcome router queue drops'
    ],
    key: 0,
    explanation: 'Three duplicate ACKs strongly indicate that packet 4000 was lost while subsequent packets arrived. Fast Retransmit retransmits segment 4000 immediately without waiting for an RTO timer. Fast Recovery adjusts cwnd to ssthresh + 3 MSS to sustain throughput.',
    errorCategories: ['E-APPLY', 'cs-scenario-reasoning'],
    origin: 'assessment',
  },
  {
    id: 'asm-cn-006',
    domainId: 'cn',
    topicId: 'prep-cn',
    competency: 'cs-application',
    difficulty: 4,
    estimatedMinutes: 2,
    questionType: 'mcq',
    assessmentRole: 'confirm',
    eligibleFor: ['baseline'],
    exposurePolicy: { maxEstimationUses: 1, releaseToPractice: false },
    scoring: { kind: 'objective', weight: 1 },
    prompt: 'An IPv4 host with address `192.168.10.68/26` needs to transmit a packet to `192.168.10.130`. What is the subnet broadcast address of the host, and is the destination host located on the same local subnet?',
    options: [
      'Broadcast: 192.168.10.127; Destination is NOT on the local subnet (must route through default gateway)',
      'Broadcast: 192.168.10.255; Destination is on the local subnet',
      'Broadcast: 192.168.10.63; Destination is NOT on the local subnet',
      'Broadcast: 192.168.10.191; Destination is on the local subnet'
    ],
    key: 0,
    explanation: 'A /26 mask has a block size of 64. The subnet containing .68 is 192.168.10.64 - 192.168.10.127 (broadcast is .127). The destination .130 is in the next subnet (192.168.10.128 - 192.168.10.191). Because it is on a different subnet, packets must be sent via the default gateway router.',
    errorCategories: ['E-APPLY', 'cs-application'],
    origin: 'assessment',
  },
];
