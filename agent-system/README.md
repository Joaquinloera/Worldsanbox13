# KINO 30-agent architecture

30 logical slots, seven named assignments and 23 unassigned reserves. Slots are configuration, not deployed AI instances. Worker adapters must be bound to real providers before any job is marked executed. No payment initiation in this service.

Backend: `server.cjs` read-only HTTP API with `/health`, `/agents`, `/agents/:id`, `/jobs`; `core.cjs` validates roster and job transitions; `core.test.cjs` unit tests. The server has no external dependencies and binds to `PORT`. Durable job persistence, authentication, queue, and provider adapters are future integration gates; never expose a public job-submission endpoint without auth.
