# system-design

## Concepts

* [API Gateway](/system-design/api-gateway.md) - Centralizing auth, routing, and rate limiting in front of backend services.
* [API Pagination](/system-design/api-pagination.md) - Cursor versus offset pagination and why cursors survive concurrent inserts.
* [Backpressure](/system-design/backpressure.md) - Propagating load signals upstream so a fast producer cannot overwhelm a slow consumer.
* [Blue-Green Deploys](/system-design/blue-green-deploys.md) - Cutting traffic between two identical environments for zero-downtime releases.
* [Bulkhead Isolation](/system-design/bulkhead-isolation.md) - Partitioning resource pools so one failing dependency cannot sink the whole service.
* [Caching Strategies](/system-design/caching-strategies.md) - Cache-aside, write-through, and write-behind patterns and their invalidation trade-offs.
* [CAP Theorem](/system-design/cap-theorem.md) - Why a partitioned distributed system must trade consistency against availability.
* [CDN Basics](/system-design/cdn-basics.md) - Edge caching static assets close to users to cut latency and origin load.
* [Circuit Breaker](/system-design/circuit-breaker.md) - Tripping open on repeated downstream failures to shed load and allow recovery.
* [Consistent Hashing](/system-design/consistent-hashing.md) - Distributing keys across nodes so adding or removing a node moves a minimal fraction of keys.
* [CQRS](/system-design/cqrs.md) - Separating the write model from read models optimized per query.
* [Event Sourcing](/system-design/event-sourcing.md) - Persisting state as an append-only sequence of domain events to replay.
* [Feature Flags](/system-design/feature-flags.md) - Decoupling deploy from release by gating code behind runtime toggles.
* [GraphQL vs REST](/system-design/graphql-vs-rest.md) - Trading a flexible client-driven query graph against cacheable resource endpoints.
* [gRPC Basics](/system-design/grpc-basics.md) - Contract-first binary RPC over HTTP/2 with streaming and code generation.
* [Idempotency Patterns](/system-design/idempotency-patterns.md) - Effectively-once semantics achieved with idempotency keys and safe request retries.
* [Load Balancing](/system-design/load-balancing.md) - Round-robin, least-connections, and consistent-hash load distribution across backends.
* [Rate Limiting](/system-design/rate-limiting.md) - Token-bucket and leaky-bucket algorithms that cap request throughput per client.
* [Service Discovery](/system-design/service-discovery.md) - Locating healthy service instances dynamically through a registry.
* [Sharded Counters](/system-design/sharded-counters.md) - Spreading a hot counter across shards to dodge write contention.
* [Webhooks Design](/system-design/webhooks-design.md) - Delivering event notifications reliably with retries, signing, and idempotent receivers.

## Sections

* [messaging/](/system-design/messaging/index.md) - 5 concepts
