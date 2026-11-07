# Cross-service change request: <short title>

- **From service**: <this repo>
- **To service(s)**: <target repo(s)>
- **Ticket**: <TICKET>
- **Blocking**: yes / no (can this repo ship first behind a flag or with a tolerant reader?)

## Why

What this service needs and which user-visible behaviour depends on it.

## Requested contract change

Exact diff of the OpenAPI / AsyncAPI / schema, plus a request/response or event example.

```yaml
# before

# after
```

## Compatibility

- Backward compatible for existing consumers? Explain.
- Rollout order (provider first, then consumer; flags; dual-write/read period).

## What this repo will do meanwhile

- e.g. tolerant reader ignores the unknown field; feature stays behind a flag until the provider ships.
