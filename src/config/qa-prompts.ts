export interface PromptSet {
  prompts: string[];
  automatedChecks?: string[];
}

export interface QAPromptLibrary {
  code: Record<string, PromptSet>;
  documentation: Record<string, PromptSet>;
  configuration: Record<string, PromptSet>;
  tests: Record<string, PromptSet>;
  database: Record<string, PromptSet>;
  security: Record<string, PromptSet>;
  performance: Record<string, PromptSet>;
}

function pack(prompts: string[], automatedChecks?: string[]): PromptSet {
  return { prompts, automatedChecks };
}

const CODE_CORE_PROMPTS = [
  "Is implementation behavior correct for happy-path and edge cases?",
  "Are failure paths explicit, observable, and recoverable?",
  "Are side effects minimized and dependencies clearly bounded?",
  "Is naming and structure maintainable for future contributors?",
];

const DOC_CORE_PROMPTS = [
  "Is the intended audience clear in opening sections?",
  "Are instructions complete and validated against current behavior?",
  "Are assumptions, prerequisites, and constraints explicit?",
  "Are references and links actionable and up to date?",
];

const CONFIG_CORE_PROMPTS = [
  "Is syntax valid and structure consistent with expected schema?",
  "Are required keys present with safe and typed values?",
  "Are sensitive values excluded, masked, or externalized?",
  "Are environment overrides and defaults clearly documented?",
];

export const QA_PROMPTS: QAPromptLibrary = {
  code: {
    python: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are type hints and docstrings complete for exported functions?",
        "Are unsafe dynamic execution paths (exec/eval) avoided?",
      ],
      ["ruff check {file}", "mypy {file}", "pytest -q"]
    ),
    typescript: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are strong types used without unnecessary any/unknown escape hatches?",
        "Are async flows typed and guarded with explicit error handling?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    javascript: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Is modern syntax used with explicit promise rejection handling?",
        "Are mutable globals and accidental shared-state mutations avoided?",
      ],
      ["npm run lint -- {file}"]
    ),
    java: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are nullability and Optional usage consistent and safe?",
        "Are streams/collections usage and complexity reasonable for scale?",
      ],
      ["./gradlew check"]
    ),
    go: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are errors wrapped with context and returned consistently?",
        "Are goroutines synchronized safely with cancellation and cleanup?",
      ],
      ["go test ./...", "go vet ./..."]
    ),
    rust: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are ownership/borrowing choices clear and free of unsafe blocks where avoidable?",
        "Are Result/Option paths handled without panics in production flows?",
      ],
      ["cargo fmt --check", "cargo clippy -- -D warnings", "cargo test"]
    ),
    csharp: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are nullable reference types and async Task flows handled correctly?",
        "Is DI usage testable without hidden service-locator patterns?",
      ],
      ["dotnet format --verify-no-changes", "dotnet test"]
    ),
    ruby: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are ActiveRecord query patterns avoiding N+1 and callback side-effects?",
        "Are service boundaries explicit with clear return contracts?",
      ],
      ["bundle exec rubocop", "bundle exec rspec"]
    ),
    php: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are strict types and input validation used consistently?",
        "Are framework lifecycle hooks used without hidden global state?",
      ],
      ["composer test", "vendor/bin/phpstan analyse"]
    ),
    kotlin: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are nullability constraints and sealed states modeled clearly?",
        "Are coroutine scopes structured to prevent leaks and orphan jobs?",
      ],
      ["./gradlew detekt", "./gradlew test"]
    ),
    swift: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are value/reference semantics and thread boundaries explicit?",
        "Are async/await and actor isolation used safely?",
      ],
      ["swift test"]
    ),
    dart: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are null safety constraints respected throughout API boundaries?",
        "Are widget rebuilds and state updates scoped correctly?",
      ],
      ["dart analyze", "dart test"]
    ),
    shell: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are shell options strict (`set -euo pipefail`) where appropriate?",
        "Are quoting and argument escaping safe against injection and globbing issues?",
      ],
      ["shellcheck {file}"]
    ),
    sql: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are queries indexed and bounded to avoid full scans on hot paths?",
        "Are transaction boundaries, locking, and rollback semantics explicit?",
      ]
    ),
    graphql: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are schema evolutions backward-compatible and deprecation-safe?",
        "Are resolver-level auth and data-loader batching implemented?",
      ]
    ),
    react: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are render paths memoized where needed to avoid unnecessary re-renders?",
        "Are hooks dependencies complete and side effects cleanup-safe?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    vue: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are reactive refs/computed usage avoiding stale state and hidden watchers?",
        "Are component contracts explicit with typed props/events?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    angular: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are services/components split by responsibility and DI scope clear?",
        "Are RxJS subscriptions disposed and error flows handled?",
      ],
      ["npm run lint -- {file}", "npm run test -- --watch=false"]
    ),
    nextjs: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are server/client boundaries and data-fetching strategies explicit?",
        "Are cache/revalidation policies configured for correctness and cost?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    nestjs: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are module boundaries and provider scopes correctly isolated?",
        "Are DTO validation and exception filters consistently enforced?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    express: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are request validation, auth guards, and error middleware consistently applied?",
        "Are route handlers thin with business logic delegated to services?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    fastify: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are schemas declared for params/query/body/response for every route?",
        "Are plugin scopes and encapsulation boundaries used correctly?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    node: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are process lifecycle handlers (signals/shutdown) graceful and idempotent?",
        "Are event-loop blocking operations avoided in critical paths?",
      ],
      ["npm run lint -- {file}", "npm run test -- --runInBand"]
    ),
    terraform: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are modules reusable with explicit inputs/outputs and validation rules?",
        "Are state, drift, and blast-radius concerns documented?",
      ],
      ["terraform fmt -check", "terraform validate"]
    ),
    ansible: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are playbooks idempotent with explicit changed_when/failed_when behavior?",
        "Are secrets and inventories handled securely and environment-scoped?",
      ],
      ["ansible-lint"]
    ),
    general: pack(
      [
        ...CODE_CORE_PROMPTS,
        "Are instrumentation and logging sufficient for debugging production failures?",
        "Are test updates aligned to behavior changes?",
      ]
    ),
  },
  documentation: {
    readme: pack([
      ...DOC_CORE_PROMPTS,
      "Are installation and quick-start commands copy-paste runnable?",
      "Are compatibility and support-policy statements explicit?",
    ]),
    "api-docs": pack([
      ...DOC_CORE_PROMPTS,
      "Are endpoints documented with request/response examples and failure modes?",
      "Are auth, rate-limit, and pagination semantics explicit?",
    ]),
    "technical-guide": pack([
      ...DOC_CORE_PROMPTS,
      "Is the explanation layered from concept to implementation detail?",
      "Are tradeoffs and alternatives documented where decisions were made?",
    ]),
    architecture: pack([
      ...DOC_CORE_PROMPTS,
      "Are component boundaries, data flow, and failure boundaries described clearly?",
      "Are diagrams/code references current with implementation?",
    ]),
    runbook: pack([
      ...DOC_CORE_PROMPTS,
      "Are operational playbooks actionable under incident pressure?",
      "Are rollback, escalation, and verification steps explicit?",
    ]),
    changelog: pack([
      ...DOC_CORE_PROMPTS,
      "Are changes grouped by impact with migration notes where needed?",
      "Are breaking changes and deprecations called out prominently?",
    ]),
    contributing: pack([
      ...DOC_CORE_PROMPTS,
      "Are local setup, test, lint, and PR expectations explicit?",
      "Are code style and review standards unambiguous?",
    ]),
    adr: pack([
      ...DOC_CORE_PROMPTS,
      "Is context, decision, alternatives, and consequences clearly captured?",
      "Are superseded/related ADR links included?",
    ]),
    onboarding: pack([
      ...DOC_CORE_PROMPTS,
      "Can a new contributor reach productive output in one session?",
      "Are permissions/tooling prerequisites and contacts listed?",
    ]),
    troubleshooting: pack([
      ...DOC_CORE_PROMPTS,
      "Are error signatures mapped to concrete diagnosis and fixes?",
      "Are quick checks and deep-dive paths both included?",
    ]),
    "release-notes": pack([
      ...DOC_CORE_PROMPTS,
      "Are user-facing changes, fixes, and known issues clearly summarized?",
      "Are upgrade and rollback instructions complete?",
    ]),
    "incident-report": pack([
      ...DOC_CORE_PROMPTS,
      "Are timeline, impact, root cause, and corrective actions explicit?",
      "Are follow-up owners and due dates tracked?",
    ]),
    faq: pack([
      ...DOC_CORE_PROMPTS,
      "Are top recurring questions answered concisely with references?",
      "Are answers scoped by audience role where necessary?",
    ]),
    general: pack([...DOC_CORE_PROMPTS]),
  },
  configuration: {
    json: pack(
      [
        ...CONFIG_CORE_PROMPTS,
        "Are schema versioning and backward compatibility expectations clear?",
      ],
      ["node -e \"JSON.parse(require('fs').readFileSync('{file}','utf8'))\""]
    ),
    yaml: pack([
      ...CONFIG_CORE_PROMPTS,
      "Are indentation, anchors, and merges deterministic and readable?",
    ]),
    env: pack([
      ...CONFIG_CORE_PROMPTS,
      "Is `.env.example` synchronized with runtime-required variables?",
    ]),
    toml: pack([
      ...CONFIG_CORE_PROMPTS,
      "Are sections and key naming consistent with tool expectations?",
    ]),
    ini: pack([
      ...CONFIG_CORE_PROMPTS,
      "Are duplicate keys/section overrides intentional and documented?",
    ]),
    dockerfile: pack(
      [
        ...CONFIG_CORE_PROMPTS,
        "Are base image pinning, user permissions, and layer caching optimized?",
        "Are build secrets and runtime secrets separated correctly?",
      ],
      ["docker build -f {file} ."]
    ),
    kubernetes: pack(
      [
        ...CONFIG_CORE_PROMPTS,
        "Are resource requests/limits and liveness/readiness probes set appropriately?",
        "Are RBAC, service accounts, and network policies least-privilege aligned?",
      ]
    ),
    "github-actions": pack(
      [
        ...CONFIG_CORE_PROMPTS,
        "Are workflow triggers scoped correctly to avoid accidental runs?",
        "Are permissions minimized and secrets referenced safely?",
      ]
    ),
    terraform: pack(
      [
        ...CONFIG_CORE_PROMPTS,
        "Are provider/version constraints explicit and state backends safe?",
      ],
      ["terraform fmt -check", "terraform validate"]
    ),
    ansible: pack(
      [
        ...CONFIG_CORE_PROMPTS,
        "Are inventories variable precedence and vault secret usage explicit?",
      ],
      ["ansible-lint"]
    ),
    nginx: pack([
      ...CONFIG_CORE_PROMPTS,
      "Are TLS/cipher settings current and upstream timeout policies safe?",
    ]),
    "package-json": pack([
      ...CONFIG_CORE_PROMPTS,
      "Are scripts deterministic and dependency ranges aligned to release policy?",
    ]),
    tsconfig: pack([
      ...CONFIG_CORE_PROMPTS,
      "Are strictness, module target, and path mappings intentional and documented?",
    ]),
    general: pack([...CONFIG_CORE_PROMPTS]),
  },
  tests: {
    unit: pack(
      [
        "Do tests cover expected behavior, edge cases, and error paths?",
        "Are assertions precise and tied to public contract behavior?",
        "Are tests deterministic with isolated setup/teardown?",
        "Are over-mocking and implementation-coupled assertions avoided?",
      ],
      ["npm test -- --run"]
    ),
    integration: pack(
      [
        "Do tests verify actual component boundaries and integration contracts?",
        "Are external dependencies stubbed realistically and failure paths covered?",
        "Is cleanup idempotent across repeated runs?",
        "Are timeout and retry semantics explicitly validated?",
      ],
      ["npm test -- --run"]
    ),
    e2e: pack(
      [
        "Do tests model user-critical flows across the full stack?",
        "Are flaky timing assumptions removed via explicit waits or polling contracts?",
        "Are artifact logs/screenshots captured for debugging failures?",
      ],
      ["npm test -- --run"]
    ),
    performance: pack(
      [
        "Are performance regressions measured against a baseline budget?",
        "Are percentile metrics (p50/p95/p99) captured and analyzed?",
        "Are warm-up and cache effects controlled in benchmark runs?",
      ]
    ),
    contract: pack(
      [
        "Are provider/consumer schemas versioned and compatibility-checked?",
        "Are backward-incompatible changes detected early?",
        "Are representative payload samples included?",
      ]
    ),
    smoke: pack(
      [
        "Do tests quickly validate deploy viability for critical endpoints/features?",
        "Are failures actionable with clear signal and minimal noise?",
      ]
    ),
    regression: pack(
      [
        "Is each historical bug encoded as a non-flaky regression test?",
        "Are test names linked to issue IDs or incident references?",
      ]
    ),
    mutation: pack([
      "Do mutation tests ensure assertions fail when logic is altered?",
      "Are weak assertions identified and strengthened?",
    ]),
    load: pack([
      "Are steady-state and spike load scenarios both covered?",
      "Are saturation, queue growth, and failure thresholds tracked?",
    ]),
    general: pack([
      "Are tests meaningful, deterministic, and aligned to user-visible behavior?",
      "Do tests provide actionable failures for fast debugging?",
    ]),
  },
  database: {
    migration: pack([
      "Is migration reversible and data-preserving under rollback?",
      "Are lock duration and backfill strategy safe for production traffic?",
      "Are indexes and constraints aligned with query patterns?",
      "Are deployment order and compatibility windows documented?",
    ]),
    schema: pack([
      "Are key types and constraints consistent across relationships?",
      "Is normalization balanced with read-path performance needs?",
      "Are audit/timestamp fields and soft-delete semantics intentional?",
      "Are naming and ownership conventions consistent?",
    ]),
    query: pack([
      "Are high-cost queries indexed and bounded with explicit limits?",
      "Are execution plans reviewed for hot paths?",
      "Are transaction scopes minimal to reduce contention?",
    ]),
    indexes: pack([
      "Do index definitions reflect real filter/sort access patterns?",
      "Are write amplification and storage overhead tradeoffs documented?",
      "Are redundant or overlapping indexes removed?",
    ]),
    seed: pack([
      "Are seed scripts deterministic and environment-safe?",
      "Are fixture datasets representative but minimal?",
      "Are PII/sensitive fixtures avoided in shared environments?",
    ]),
    backup: pack([
      "Are backup cadence and retention aligned with RPO/RTO targets?",
      "Are restore tests performed and documented regularly?",
      "Are encryption and access controls enforced for backup artifacts?",
    ]),
    general: pack([
      "Are schema, migration, and query decisions safe for growth and operability?",
      "Are rollback and incident-recovery paths proven?",
    ]),
  },
  security: {
    general: pack([
      "Are all untrusted inputs validated, sanitized, and bounded?",
      "Are authorization checks enforced at each sensitive boundary?",
      "Are secrets never logged, hard-coded, or exposed in artifacts?",
      "Are abuse controls (rate limiting, throttling, lockouts) in place?",
    ]),
    api: pack([
      "Are endpoint auth and permission checks applied consistently?",
      "Are injection/XSS/CSRF/CORS risks mitigated for each route?",
      "Do errors avoid leaking stack traces or internal topology?",
      "Are request body sizes and timeout guards configured?",
    ]),
    auth: pack([
      "Are token/session lifetimes, rotation, and revocation policies defined?",
      "Is MFA enforced where risk profile requires it?",
      "Are password and credential recovery flows abuse-resistant?",
    ]),
    secrets: pack([
      "Are secrets sourced from managed stores instead of source code?",
      "Are key rotation and compromise response procedures documented?",
      "Are secret scopes least-privilege and time-bounded where possible?",
    ]),
    dependency: pack([
      "Are dependencies scanned for known vulnerabilities?",
      "Are transitive dependency risks monitored and patched quickly?",
      "Are pinning and provenance policies defined for critical packages?",
    ]),
    network: pack([
      "Is traffic encrypted in transit with modern TLS defaults?",
      "Are network boundaries segmented with least-privilege policies?",
      "Are inbound/outbound rules explicit and audited?",
    ]),
    compliance: pack([
      "Are data classification and retention controls aligned to policy?",
      "Are audit logs immutable, searchable, and access-controlled?",
      "Are privacy/security obligations reflected in implementation details?",
    ]),
  },
  performance: {
    general: pack([
      "Are hot paths measured with profiling data instead of assumptions?",
      "Are batching/caching opportunities used without sacrificing correctness?",
      "Are workloads paginated, streamed, or chunked safely?",
      "Are SLO budgets and failure thresholds clearly defined?",
    ]),
    frontend: pack([
      "Are bundle size, hydration cost, and render depth controlled?",
      "Are expensive re-renders and layout thrashing minimized?",
      "Are lazy loading and asset optimization configured appropriately?",
      "Are Core Web Vitals regressions measured and tracked?",
    ]),
    backend: pack([
      "Are synchronous bottlenecks removed from request hot paths?",
      "Are expensive calls cached, deduplicated, or parallelized safely?",
      "Are queueing/backpressure mechanisms present for burst traffic?",
    ]),
    database: pack([
      "Are query plans and index usage optimized for p95 traffic?",
      "Are connection pooling and transaction lifetimes tuned for load?",
      "Are high-cardinality scans and N+1 patterns eliminated?",
    ]),
    caching: pack([
      "Are cache keys stable and invalidation semantics explicit?",
      "Are cache stampede protections and TTL strategies implemented?",
      "Are stale data risks understood and acceptable per use case?",
    ]),
    queueing: pack([
      "Are queues sized with retry, dead-letter, and backoff policies?",
      "Are consumer idempotency and ordering assumptions explicit?",
      "Are throughput and lag metrics monitored with alerts?",
    ]),
  },
};
