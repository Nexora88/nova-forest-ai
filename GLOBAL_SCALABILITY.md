# GLOBAL_SCALABILITY.md
## Global Forest Monitoring Architecture — Google Cloud and Microsoft Azure

**Status: target architecture proposal.** This document describes a possible future design; it does not claim that global Kubernetes infrastructure, worldwide coverage, or million-hectare production throughput is currently deployed.

## 1. Goal and design principles

NexoraWildfire AI combines satellite observations, meteorological feeds, fire-hotspot detections, vegetation indices, and user-defined areas for environmental decision support. To process millions of hectares concurrently, the system should use geospatial tiling, asynchronous jobs, bounded concurrency, idempotent processing, object storage, and Kubernetes autoscaling—not one enormous synchronous request.

Recommended initial strategy: choose one primary cloud, prove data quality and cost with a single-region pilot, then add regions only when residency, resilience, and recovery requirements are defined. Running GCP and Azure active-active from day one increases complexity and cost.

## 2. Cloud-neutral architecture

\`\`\`mermaid
flowchart TD
    A[Sentinel-2 / STAC catalogs] --> B[Catalog poller and scene deduplication]
    C[NASA FIRMS observations] --> D[Feed adapter and provenance checks]
    E[Weather providers] --> F[Weather adapter]
    G[User areas and schedules] --> H[Area scheduler]
    B --> Q[Durable work queue]
    D --> Q
    F --> Q
    H --> Q
    Q --> W[Geospatial dispatcher]
    W --> T[Tile / polygon partitioner]
    T --> K[Kubernetes worker pools]
    K --> P[Object storage: raw and derived]
    K --> V[Quality and CRS validation]
    V --> I[NDVI / NDMI and environmental features]
    I --> S[PostGIS and analytical store]
    S --> API[Versioned API and alert evaluator]
    API --> UI[Map, areas, dashboards]
    API --> N[Consent-based notifications]
    S --> O[Lineage, metrics and audit records]
\`\`\`

### Regional resilience pattern

\`\`\`mermaid
flowchart LR
    U[Web and mobile clients] --> G[Global DNS, CDN and WAF]
    G --> A[Region A API]
    G --> B[Region B API]
    A --> K1[GKE or AKS cluster A]
    B --> K2[GKE or AKS cluster B]
    K1 --> Q1[Regional queue]
    K2 --> Q2[Regional queue]
    Q1 --> W1[CPU / optional GPU workers]
    Q2 --> W2[CPU / optional GPU workers]
    W1 --> D1[Regional object storage]
    W2 --> D2[Regional object storage]
    D1 --> C[Replicated metadata catalog]
    D2 --> C
\`\`\`

Use active-active APIs only after data replication, conflict resolution, residency, and incident-response rules are tested. A simpler pilot can use one primary processing region and a separately tested recovery region.

## 3. Scanning millions of hectares concurrently

### 3.1 Partition by geography and time

1. Normalize and validate each monitoring polygon, including its coordinate reference system.
2. Intersect it with a documented global grid, such as an equal-area grid or H3/S2 index at a selected resolution.
3. Create bounded work units by tile × scene × time window × algorithm version.
4. Skip tiles without valid observations and record an explicit no-observation status; never substitute zero vegetation or zero fire risk.
5. Deduplicate with a deterministic key such as source + scene ID + tile ID + algorithm version.
6. Store raw imagery, intermediate rasters, and derived products as versioned objects. Store searchable metadata and zonal statistics separately.
7. Retry transient failures with bounded exponential backoff and a dead-letter queue. Invalid input must not retry forever.

Tiling caps memory requirements, enables independent retries, and lets different continents be processed concurrently without one failed tile cancelling a whole region.

### 3.2 Backpressure and idempotency

The queue is the control plane for workload volume. Producers publish compact job references, not raster payloads. Workers acknowledge jobs only after output and metadata are durable. Scale from queue depth and oldest-message age as well as CPU/memory. Apply per-provider and per-region concurrency caps to protect API quotas, databases, and egress budgets.

### 3.3 Separate worker pools

| Pool | Workload | Scaling signal | Guardrail |
|---|---|---|---|
| Ingestion | STAC discovery, FIRMS and weather adapters | queue age, latency | strict provider rate limits |
| Raster / index | reprojection, cloud masks, NDVI/NDMI, zonal stats | queued tiles, memory | bounded concurrency |
| ML inference | optional validated models | queue age, accelerator utilization | GPU only after benchmarks |
| API | map features, area state, job status | p95 latency, concurrency | no full-scene work inline |
| Notifications | consented browser/web-push delivery | pending delivery count | isolate provider failures and opt-outs |

## 4. Google Cloud Platform reference

- **Global edge:** Cloud Load Balancing, Cloud CDN, Cloud Armor, managed DNS.
- **Kubernetes:** regional GKE clusters; separate node pools for API, CPU geospatial jobs, and optional accelerators.
- **Queue:** Pub/Sub subscriptions with retention and dead-letter topics.
- **Object storage:** Cloud Storage with lifecycle rules, encryption, access controls, and versioning where appropriate.
- **Geospatial data:** Cloud SQL for PostgreSQL with PostGIS for operational queries; BigQuery for historical analytics only where its workload and cost model fit.
- **Secrets and identity:** Secret Manager and Workload Identity; never embed provider secrets in browser code or source control.
- **Observability:** Cloud Monitoring, Logging, Error Reporting, distributed traces, and budget alerts.

Use Horizontal Pod Autoscaler for resource metrics and queue-aware scaling (for example, KEDA where approved) for backlog and message age. Let cluster autoscaling add nodes only to the worker pool that needs them. Set resource requests and limits from representative raster benchmarks. Use preemptible capacity only for restartable, idempotent batch jobs.

## 5. Microsoft Azure reference

- **Global edge:** Azure Front Door, Web Application Firewall, Azure DNS.
- **Kubernetes:** AKS with isolated API, CPU geospatial, and optional GPU node pools.
- **Queue:** Azure Service Bus for durable work commands and dead-letter handling; choose Event Hubs only when event-stream semantics are required.
- **Object storage:** Blob Storage / ADLS Gen2 with lifecycle management, encryption, private endpoints, and access policies.
- **Geospatial data:** Azure Database for PostgreSQL with PostGIS; add analytical services only when measured workloads justify them.
- **Secrets and identity:** Key Vault, managed identities, and workload identity for AKS.
- **Observability:** Azure Monitor, Log Analytics, Application Insights, traces, and cost-management budgets.

Use Horizontal Pod Autoscaler for resource metrics and KEDA or an equivalent queue-aware scaler for backlog-driven processing. Isolate batch pools so raster work cannot starve APIs. Configure zone-aware placement, pod disruption budgets, readiness/startup probes, and namespace resource quotas.

## 6. Data contracts and scientific integrity

Every derived record should retain, where applicable: provider and product, immutable source scene/observation ID, acquisition/ingestion/processing timestamps, tile ID and CRS, cloud/quality flags, valid-pixel count, algorithm/model version, configuration hash, uncertainty indicators, job/trace ID, and retry count.

Use explicit statuses: available, partial, no_observation, not_configured, provider_error, and processing_error. **No observation is not zero risk.** A NASA FIRMS thermal anomaly is an observation, not by itself a confirmed wildfire. Risk indicators must not be presented as official alerts unless an authorized authority has verified and approved that workflow.

Keep raw inputs immutable and derived outputs reproducible. Validate geometry size, allowed CRS, file type, numeric ranges, authorization, and resource limits before scheduling expensive work.

## 7. Global map serving

- Serve static assets and cacheable vector tiles through a CDN.
- Use zoom-dependent simplification and aggregation; never send all global polygons to every client.
- Return compact feature properties; load detailed time series only after an area is selected.
- Cache only data with explicit freshness and authorization semantics. Do not publicly cache private user polygons or account-specific data.
- Add regional read replicas or materialized aggregates only when measurements identify database reads as the bottleneck.
- Display observation timestamps and freshness state. Keep map interaction responsive while satellite processing runs asynchronously.

## 8. Security, privacy, and governance

- Use least-privilege workload identities and managed secret stores; rotate credentials with an auditable process.
- Isolate public APIs, worker networks, databases, and private storage. Prefer private endpoints and controlled egress.
- Enforce authentication, authorization, request and upload limits, rate limits, and per-tenant quotas.
- Encrypt data in transit and at rest. Prevent tokens, personal data, and precise private-area geometry from leaking into logs.
- Define retention and deletion policies for imagery, derived outputs, user areas, and audit records.
- Review provider terms, attribution, licensing, jurisdiction, and data residency before global expansion.
- Keep an approval gate for external alerts and public claims. This prototype is not a substitute for official emergency systems.

## 9. Reliability and observability

Measure ingestion delay/provider availability, queue depth and oldest job, tile processing time/success/retries, dead-letter count, valid-pixel coverage/cloud ratio, data freshness, API p50/p95/p99 latency, database saturation, storage growth, egress, notification outcomes, and cost per successful tile or square kilometre.

Create synthetic checks for every provider and processing stage. Provider outages must change the UI to unavailable or stale instead of leaving an old score appearing current. Runbooks should cover queue backlog, malformed source data, region failure, expired credentials, and runaway costs.

## 10. Capacity and cost planning

Do not promise a hectares-per-hour number before benchmarking real scenes, cloud cover, resolution, algorithms, and hardware. Measure bytes per scene and square kilometre, processing time and peak memory per tile, database writes, cache hit rate, client payload size, provider throttling, retries, and egress.

A first-order estimate is:

**required workers ≈ queued tiles × measured average worker-seconds ÷ target processing-window seconds**

Add headroom and account for provider quotas and database throughput; worker count alone does not guarantee throughput. Use cloud-optimized raster formats where appropriate, lifecycle policies for intermediates, bounded concurrency, queue backpressure, and budget alerts with circuit breakers.

## 11. Delivery phases

### Phase 0 — Correctness and measurement
Define data contracts, status vocabulary, geometry limits, and algorithm versioning. Test tiling, CRS handling, cloud masks, index calculations, and no-data cases. Publish reproducible benchmark results.

### Phase 1 — Single-region pilot
Deploy one managed Kubernetes cluster, durable queue, object store, PostGIS, secrets manager, and monitoring. Process a limited set of authorized polygons. Verify retries, freshness, costs, and security.

### Phase 2 — Regional batch scale
Add queue-aware autoscaling, isolated worker pools, tile deduplication, immutable intermediates, and provider rate limits. Load-test backlog recovery and provider outages.

### Phase 3 — Multi-region resilience
Define residency, replication, conflict resolution, regional failover, and disaster-recovery objectives. Add a second region only after recovery drills prove the objectives.

### Phase 4 — Million-hectare concurrency target
Use benchmarks to set workload budgets and processing windows. Ramp in measured stages (for example, 10k, 100k, then 1M hectares). Increase concurrency only while quality, freshness, provider quotas, database capacity, and budget remain within guardrails.

## 12. Acceptance gates for a global-scale claim

A worldwide-coverage or million-hectare throughput claim requires evidence that representative regions and seasons were processed using real provider data; benchmark reports define area, scene count, resolution, time window, and valid-pixel coverage; retry and duplicate-delivery tests pass; backlog and region-failure drills meet recovery objectives; every result includes lineage, timestamps, quality flags, and honest no-data states; and privacy, licensing, security, and cost reviews are complete.

**Bottom line:** Kubernetes provides orchestration and elastic worker capacity; it does not create global coverage or guarantee fast satellite processing. Scale comes from a durable geospatial queue, carefully partitioned tiles, validated source data, measured workloads, and transparent status reporting.
