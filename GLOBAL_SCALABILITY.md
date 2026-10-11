# Global Forest Monitoring Architecture — GCP and Azure

**Status: proposed reference architecture, not a deployed production claim.** NexoraWildfire AI does not currently claim that it scans millions of hectares worldwide. This document describes a technically plausible path to that scale, with measurable gates before any coverage or throughput statement is published.

## Executive summary

The scaling unit is a **bounded geospatial work item**, not a whole continent or a giant synchronous API request. Each request is normalized, split into tile/scene/time jobs, queued durably, processed by isolated Kubernetes worker pools, validated, and published with lineage and quality status. The API serves already-computed summaries and map tiles; it never performs a large raster job in a user request.

Start with one cloud and one region, benchmark representative data, and expand only when reliability, provider quotas, data residency, and costs are known. GCP and Azure can both support this design. Running both active-active from day one adds replication and operations complexity without proving the scientific product first.

## 1. System context and data flow

~~~mermaid
flowchart TD
  SAT[Sentinel-2 / STAC catalog] --> ING[Scene discovery and deduplication]
  FIRMS[NASA FIRMS observations] --> HOT[Hotspot feed adapter]
  WX[Weather providers] --> MET[Weather adapter]
  USER[Saved areas and schedules] --> SCHED[Area scheduler]
  ING --> Q[Durable queue]
  HOT --> Q
  MET --> Q
  SCHED --> Q
  Q --> DISPATCH[Geospatial job dispatcher]
  DISPATCH --> GRID[Polygon validation and tile partitioner]
  GRID --> CPU[Kubernetes CPU worker pool]
  GRID --> GPU[Optional inference worker pool]
  CPU --> OBJ[Versioned object storage]
  GPU --> OBJ
  OBJ --> QA[Quality, CRS and provenance checks]
  QA --> INDEX[NDVI / NDMI and zonal statistics]
  INDEX --> DB[PostGIS operational store]
  INDEX --> LAKE[Historical analytical store]
  DB --> API[Versioned API and alert evaluator]
  LAKE --> API
  API --> MAP[Map, areas and dashboards]
  API --> ALERT[Consent-based notifications]
  QA --> AUDIT[Lineage, metrics and audit events]
~~~

### Design boundaries

- **Ingestion** discovers and records source observations. It does not silently convert missing data into zero values.
- **Processing** is asynchronous and idempotent. A retry cannot create a duplicate result for the same source, tile and algorithm version.
- **Serving** returns precomputed features, status and provenance. Expensive raster processing is kept off the interactive request path.
- **Scientific status** is explicit: available, partial, no_observation, not_configured, provider_error, or processing_error.
- **Safety status** is equally explicit: a thermal anomaly is an observation, not by itself a confirmed wildfire or an official warning.

## 2. Multi-region topology

~~~mermaid
flowchart LR
  CLIENT[Web and mobile clients] --> EDGE[Global DNS, CDN and WAF]
  EDGE --> R1[Region A API]
  EDGE --> R2[Region B API]
  R1 --> K1[GKE or AKS cluster A]
  R2 --> K2[GKE or AKS cluster B]
  K1 --> Q1[Regional durable queue]
  K2 --> Q2[Regional durable queue]
  Q1 --> W1[Regional workers]
  Q2 --> W2[Regional workers]
  W1 --> O1[Regional object storage]
  W2 --> O2[Regional object storage]
  O1 --> META[Replicated metadata and catalog]
  O2 --> META
  META --> READ[Read API and map tiles]
~~~

Use a **single primary processing region plus a tested recovery region** for the first production release. Consider active-active APIs later, after conflict resolution, regional data residency, queue ownership, replication lag, failover, and recovery time objectives have been exercised in a failure test.

## 3. How to scan millions of hectares concurrently

### 3.1 Partition geography, source and time

1. Validate the polygon, coordinate reference system (CRS), coordinate ranges, geometry validity, and maximum allowed area.
2. Intersect the polygon with a documented equal-area grid or a selected H3/S2 tiling level. Record the grid and resolution version.
3. Generate bounded jobs keyed by provider, scene ID, tile ID, time window, and algorithm version.
4. Discover source scenes once and deduplicate before fan-out. Avoid downloading the same source scene for every user area.
5. Process each tile independently; persist checkpoints and outputs before acknowledging the queue message.
6. Store immutable raw inputs and versioned derived products in object storage. Store searchable metadata, zonal statistics and current state in the operational database.
7. Record no-data tiles as no_observation; do not replace them with zero NDVI, zero fire risk, or a green map colour.

This enables parallel work across continents while keeping memory bounded and allowing failed tiles to be retried without restarting a whole regional run.

### 3.2 Queueing, backpressure and idempotency

The queue is the workload control plane. Producers publish small job references and metadata, not large raster payloads. Workers acknowledge only after durable output and metadata are committed. Retry transient errors with bounded exponential backoff; route poison messages to a dead-letter queue. Validate and reject malformed inputs rather than retrying forever.

Autoscale on multiple signals:
- queue depth and oldest-message age;
- worker CPU and memory;
- raster processing latency and failure rate;
- provider rate-limit responses and outstanding requests;
- database connection pressure and object-storage throughput.

Set hard concurrency caps per provider and region. A large backlog must not overload external providers or starve interactive APIs.

### 3.3 Isolated worker pools

| Pool | Typical work | Scaling signal | Guardrail |
|---|---|---|---|
| Ingestion | STAC discovery, FIRMS and weather adapters | queue age, request latency | provider quotas and retry budget |
| Geospatial CPU | reprojection, cloud masks, NDVI/NDMI, zonal stats | pending tiles, CPU and memory | bounded tile size and memory limit |
| ML inference | optional validated models | queue age, accelerator utilization | GPU only after benchmarks justify it |
| API and map serving | saved areas, job status, map features | p95 latency, concurrency | never run whole-scene processing inline |
| Notifications | consented browser push | pending deliveries and failures | isolated provider failures and opt-outs |

Use Kubernetes requests/limits, readiness/startup probes, PodDisruptionBudgets, topology spread, namespace quotas and graceful shutdown. Only use preemptible/spot capacity for restartable, idempotent batch work.

## 4. Google Cloud Platform reference deployment

| Concern | Suggested GCP service | Design notes |
|---|---|---|
| Global edge | Cloud Load Balancing, Cloud CDN, Cloud Armor, Cloud DNS | TLS, WAF, routing and cacheable static/map assets |
| Kubernetes | Regional Google Kubernetes Engine (GKE) | Separate node pools for API, geospatial CPU and optional accelerators |
| Durable jobs | Pub/Sub | Acknowledgements, retention, dead-letter topics and subscription-level controls |
| Object storage | Cloud Storage | Lifecycle rules, encryption, private access, retention and versioning policy |
| Operational geospatial data | Cloud SQL for PostgreSQL with PostGIS | Keep transactions and interactive queries separate from batch raster work |
| Historical analytics | BigQuery when benchmarked workloads justify it | Partition and cluster tables; apply cost controls |
| Secrets and identity | Secret Manager and Workload Identity | No credentials in browser code, commits, logs or build output |
| Observability | Cloud Monitoring, Cloud Logging, Error Reporting and traces | Correlate request, queue, tile and provider identifiers |
| Cost controls | Budgets, alerts, quotas and labels | Separate cost attribution by environment, region and workload |

### GKE scaling model

Use Horizontal Pod Autoscaler for resource signals and queue-aware scaling (for example, KEDA where supported and approved) for backlog age/depth. Cluster autoscaling should add capacity to the worker pool that needs it, rather than scaling every service together. Tune resource requests from representative scene/tile benchmarks; do not guess node sizes from hectares alone.

Use zonal/region-aware placement for API reliability. For batch workers, prefer retryable jobs and checkpointed outputs over long-running stateful pods. Set per-tenant and per-provider concurrency budgets to avoid a single large area consuming all capacity.

## 5. Microsoft Azure reference deployment

| Concern | Suggested Azure service | Design notes |
|---|---|---|
| Global edge | Azure Front Door, Web Application Firewall, Azure DNS | Global routing, TLS and edge security |
| Kubernetes | Azure Kubernetes Service (AKS) | Separate node pools for API, geospatial CPU and optional GPU workloads |
| Durable jobs | Azure Service Bus | Queues, dead-letter queues, lock renewal and controlled retries |
| Event streams | Event Hubs only when streaming semantics are needed | Do not use a stream platform as a default replacement for a job queue |
| Object storage | Blob Storage / ADLS Gen2 | Lifecycle policies, encryption, private endpoints and access controls |
| Operational geospatial data | Azure Database for PostgreSQL with PostGIS | Apply connection pooling and query limits |
| Secrets and identity | Key Vault, managed identities and AKS workload identity | No static credentials in application images or source control |
| Observability | Azure Monitor, Log Analytics and Application Insights | Trace requests through queue, worker and API layers |
| Cost controls | Cost Management budgets, alerts and resource tags | Attribute cost by region, environment and job family |

### AKS scaling model

Use HPA for pod resource metrics and queue-aware scaling (for example, KEDA where appropriate) for queued work. Keep CPU-heavy raster processing in dedicated pools with resource quotas so it cannot starve the API. Configure zone-aware placement, disruption budgets, probes, and graceful worker termination. Store secrets in Key Vault and use workload identity rather than long-lived service-principal secrets wherever possible.

## 6. Throughput planning without unsupported claims

“Hectares per hour” is not a reliable capacity promise by itself. Throughput depends on source-scene availability, cloud cover, pixel resolution, polygon fragmentation, reprojection, algorithm complexity, provider limits, and output resolution.

Run a controlled benchmark:
1. Select representative tiles and scenes from multiple climates and seasons.
2. Measure p50/p95 processing time, valid-pixel fraction, memory, retries, bytes read/written, and cost per tile.
3. Repeat at increasing worker counts to detect provider, storage, database and network bottlenecks.
4. Estimate capacity only from successful, quality-checked output—not queue submissions or attempted hectares.
5. Publish a range with workload assumptions and a date, and repeat the benchmark after material pipeline changes.

A first-order estimate can be expressed as:

**completed tiles per hour ≈ active workers × 3600 / p95 seconds per tile × measured utilization**

Then convert tile throughput to hectares only when the grid resolution and valid coverage are known. This is a planning estimate, not a service-level guarantee.

## 7. Data contracts and scientific integrity

Every derived feature should retain, where applicable:
- provider and product name;
- immutable source scene/observation ID and acquisition time;
- ingestion and processing timestamps;
- tile ID, CRS, grid resolution and geometry version;
- cloud/quality flags and valid-pixel count;
- algorithm/model version and configuration hash;
- uncertainty/quality indicators and missing-data reason;
- job ID, trace ID, retry count and output object version.

Keep raw inputs immutable and derived outputs reproducible. Validate geometry size, CRS, file type, numeric ranges, access rights and resource limits before expensive processing.

Do not label an illustrative weighted indicator as a trained model, probability, or official warning. A thermal anomaly is not conclusive proof of a wildfire. Any alert workflow intended for operational emergency use needs independent validation, monitoring, human/authority review, and a clear responsibility model.

## 8. Global map delivery and user experience

- Serve cacheable vector tiles and static assets from a CDN.
- Use zoom-dependent generalization and aggregation; do not send entire national or global GeoJSON datasets to every browser.
- Fetch fine-grained geometry only for the selected region and zoom level.
- Use server-side spatial indexes and bounded viewport queries.
- Cache by layer, zoom, tile, data timestamp and algorithm version. Invalidate when the underlying verified data changes.
- On a provider failure, preserve the last known result with its timestamp and a clear stale badge; never present it as current.
- On no observation, show a neutral/no-data style rather than implying low risk.
- Respect reduced-motion preferences and provide a way to pause animated hotspot effects. Animation is an attention aid, not a severity metric.

## 9. Security, privacy and governance

- Use least-privilege service identities, private object buckets, encryption in transit/at rest, and secret rotation.
- Never expose NASA, Copernicus or other provider credentials to the browser.
- Apply authentication and authorization at the API; validate all geometry and query limits server-side.
- Rate-limit expensive area submissions and isolate tenants.
- Keep audit records for data access, configuration changes and alert actions while avoiding unnecessary personal data.
- Define retention, deletion, regional residency and disaster-recovery policies before multi-region rollout.
- Add budget alarms and maximum job budgets to avoid surprise compute and egress costs.

## 10. Observability and acceptance gates

Track:
- queue depth and oldest message age;
- successful tiles per hour and end-to-end freshness;
- p50/p95 processing duration and cost per successful tile;
- provider availability, rate limits and quota exhaustion;
- no-data/partial-data ratio and valid-pixel coverage;
- job retry and dead-letter rate;
- API p95 latency, error rate and database saturation;
- alert delivery success and opt-out rate;
- regional recovery time and replication lag.

Do not claim global coverage or production scale until all gates below are evidenced:

1. Reproducible benchmark over representative scenes and regions.
2. Provider entitlement, quota and data licensing verified.
3. Scientific quality checks and missing-data behavior reviewed.
4. Load test confirms bounded latency under a defined workload.
5. Failure test covers provider outage, queue backlog, worker termination and regional loss.
6. Cost model includes compute, storage, egress, observability and provider costs.
7. Security review verifies secrets, identity, access and tenant isolation.
8. User-facing coverage/status labels match regions with verified data.

## 11. Phased implementation roadmap

**Phase A — Reliable pilot:** one cloud, one region, one durable queue, versioned object storage, PostGIS, bounded worker pool, provider diagnostics, truthful no-data states, and automated browser/API checks.

**Phase B — Parallel processing:** geospatial tiling, deduplication, idempotent workers, queue-aware autoscaling, quality/lineage records, cost-per-tile metrics, and a benchmark report.

**Phase C — Regional resilience:** recovery region, tested backups, replication-lag monitoring, runbooks, failover drills, and data-residency rules.

**Phase D — Global rollout:** staged regions, region-specific quotas and observability, internationalized map/status UX, data coverage registry, and independently verified performance claims.

**Current status:** this is a design proposal. Actual GKE/AKS clusters, global coverage, multi-region processing and million-hectare throughput must not be presented as deployed until the corresponding infrastructure and acceptance gates exist.
