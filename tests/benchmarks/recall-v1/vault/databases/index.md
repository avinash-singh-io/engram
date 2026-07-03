# databases

## Concepts

* [Bulk Loading](/databases/bulk-loading.md) - Ingesting large datasets fast by deferring index and constraint maintenance.
* [Change Data Capture](/databases/change-data-capture.md) - Streaming a database change log to downstream systems as an event feed.
* [Connection Pooling](/databases/connection-pooling.md) - Reusing a bounded set of database connections to survive traffic spikes.
* [Foreign Keys](/databases/foreign-keys.md) - Enforcing referential integrity between related tables at the database.
* [Hot Partitions](/databases/hot-partitions.md) - How a skewed key distribution overloads a single database partition.
* [Materialized Views](/databases/materialized-views.md) - Precomputing and storing an expensive query result for fast reads.
* [Multiversion Concurrency Control](/databases/mvcc.md) - Serving each transaction a consistent snapshot by keeping multiple row versions.
* [Partitioning vs Sharding](/databases/partitioning-vs-sharding.md) - Splitting a table within a node versus spreading it across independent nodes.
* [Replication Lag](/databases/replication-lag.md) - Why asynchronous replicas fall behind the primary and how it breaks read-your-writes.
* [Write-Ahead Logging](/databases/write-ahead-logging.md) - Durably recording changes to a log before applying them so crashes can be recovered.

## Sections

* [indexing/](/databases/indexing/index.md) - 4 concepts
* [nosql/](/databases/nosql/index.md) - 3 concepts
* [sql/](/databases/sql/index.md) - 4 concepts
