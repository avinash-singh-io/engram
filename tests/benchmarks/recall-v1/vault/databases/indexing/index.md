# indexing

## Concepts

* [B-Tree Indexes](/databases/indexing/b-tree-indexes.md) - How balanced B-tree structures make database range lookups and scans logarithmic.
* [Covering Indexes](/databases/indexing/covering-indexes.md) - Answering a query entirely from the index so the heap is never touched.
* [Hash Indexes](/databases/indexing/hash-indexes.md) - Constant-time equality lookups from a hash index and why they cannot serve ranges.
* [LSM Trees](/databases/indexing/lsm-trees.md) - Log-structured merge trees that batch writes in memory and compact to sorted runs.
