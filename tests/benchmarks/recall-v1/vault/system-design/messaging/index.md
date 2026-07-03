# messaging

## Concepts

* [Dead Letter Queues](/system-design/messaging/dead-letter-queues.md) - Quarantining messages that repeatedly fail so the main queue keeps flowing.
* [Exactly-Once Delivery](/system-design/messaging/exactly-once-delivery.md) - Why exactly-once is really at-least-once delivery plus idempotent processing.
* [Kafka Basics](/system-design/messaging/kafka-basics.md) - Partitioned, replicated, append-only logs and consumer-group offset tracking in Kafka.
* [RabbitMQ vs Kafka](/system-design/messaging/rabbitmq-vs-kafka.md) - Choosing between a smart broker with queues and a dumb broker with a durable log.
* [Transactional Outbox](/system-design/messaging/outbox-pattern.md) - Publishing events atomically with a database write by staging them in an outbox table.
