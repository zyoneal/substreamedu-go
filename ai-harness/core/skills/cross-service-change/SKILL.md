---
name: cross-service-change
description: Handles requirements that span multiple microservices. Drafts a formal contract change request and compatibility plan without mutating foreign repositories. Use whenever a task requires modifications to another service's API, database, or event schema.
argument-hint: "<target-service-name>"
---

# Cross-Service Change Protocol

> [!IMPORTANT]
> **STRICT REPOSITORY BOUNDARY**
> In a multi-repo microservice architecture, an agent NEVER directly touches, alters, or commits code in another service's repository. Each service is deployed, versioned, and verified independently.

---

## 1. When to use this skill
- Current service needs a new field in an upstream API response.
- Current service needs a new Kafka event topic or changed payload schema.
- An authentication/authorization claim must be added by IAM/Auth service.
- Current service needs to emit an event that another service must consume.

---

## 2. Process

### Step 1: Design Backward-Compatible Contract
- Any change to HTTP APIs or Kafka event schemas MUST be backward-compatible:
  - Adding optional fields is allowed.
  - Renaming or deleting fields is forbidden without an enterprise deprecation cycle.
  - Adding new endpoints or event topics is allowed.

### Step 2: Formulate Compatibility Strategy
Answer:
1. **Can this service deploy first?**
   - Yes: Tolerant reader pattern (service handles missing new field with a fallback).
2. **Does provider service deploy first?**
   - Feature flag or staged rollout: Provider deploys new schema -> Consumer enables feature.

### Step 3: Produce Cross-Service Request
1. Copy `.harness/templates/cross-service-request.md` to `docs/specs/<TICKET>-cross-service-<target-service>.md`.
2. Document:
   - Target service and owning team.
   - Exact contract diff (OpenAPI YAML or AsyncAPI/Avro/Protobuf schema).
   - Concrete JSON example of payload before and after.
   - Rollout sequence and fallback behaviour during deployment window.
3. Stop work on the dependent consumer code until the contract is accepted by the provider service.
