# distributed-systems

## Concepts

* [Chain Replication](/distributed-systems/chain-replication.md) - Ordering replicas in a chain so the tail serves strongly consistent reads.
* [Clock Skew](/distributed-systems/clock-skew.md) - How drift between machine clocks breaks timestamp ordering and lease safety.
* [CRDT Basics](/distributed-systems/crdt-basics.md) - Conflict-free replicated data types that merge concurrent edits deterministically.
* [Fencing Tokens](/distributed-systems/fencing-tokens.md) - Rejecting stale lock holders with a monotonically increasing fencing token.
* [Gossip Protocol](/distributed-systems/gossip-protocol.md) - Epidemic-style membership and state dissemination that scales to large clusters.
* [Idempotent Consumers](/distributed-systems/idempotent-consumers.md) - Deduplicating redelivered messages so reprocessing has no observable effect.
* [Lamport Clocks](/distributed-systems/lamport-clocks.md) - A logical clock that captures happened-before ordering with a single counter.
* [Quorum Reads and Writes](/distributed-systems/quorum-reads.md) - Choosing read and write quorums so their overlap guarantees fresh reads.
* [Saga Pattern](/distributed-systems/saga-pattern.md) - Coordinating a long-running transaction as compensatable local steps across services.
* [Split Brain](/distributed-systems/split-brain.md) - Why a partitioned cluster can elect two leaders and how quorums prevent it.
* [Two-Phase Commit](/distributed-systems/two-phase-commit.md) - A blocking atomic-commit protocol coordinating a transaction across participants.
* [Vector Clocks](/distributed-systems/vector-clocks.md) - Tracking causal ordering of events across nodes without synchronized physical clocks.

## Sections

* [consensus/](/distributed-systems/consensus/index.md) - 3 concepts
* [temporal/](/distributed-systems/temporal/index.md) - 3 concepts
