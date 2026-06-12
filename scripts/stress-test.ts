/**
 * Teste de estresse da Festa dos Bairros API.
 *
 * Simula ~50–100 operadores (caixa, barraca, preparo) com o mix de endpoints
 * usado pelo manager em horário de pico.
 *
 * Uso:
 *   bun run scripts/stress-test.ts
 *   bun run scripts/stress-test.ts --users 100 --duration 120
 *   bun run scripts/stress-test.ts --writes          # inclui POST/PATCH (staging/dev)
 *   bun run stress:test
 *
 * Variáveis de ambiente:
 *   STRESS_BASE_URL  (padrão http://localhost:3333)
 *   STRESS_VUS       (padrão 75)
 *   STRESS_DURATION  segundos (padrão 60)
 *   STRESS_RAMP_UP   segundos (padrão 10)
 */
import "dotenv/config";

type HttpMethod = "GET" | "POST" | "PATCH";

type Session = {
  username: string;
  token: string;
  userId: number;
  stallId: number | null;
  isAdmin: boolean;
};

type RequestMetric = {
  name: string;
  method: HttpMethod;
  path: string;
  status: number;
  durationMs: number;
  ok: boolean;
  error?: string;
};

type Stats = {
  total: number;
  ok: number;
  failed: number;
  latencies: number[];
  byEndpoint: Map<string, { ok: number; failed: number; latencies: number[] }>;
};

const STALL_ACCOUNTS = [
  { username: "retiro", password: "senha123" },
  { username: "5marias", password: "senha123" },
  { username: "pedra", password: "senha123" },
  { username: "brisa", password: "senha123" },
  { username: "catruz", password: "senha123" },
  { username: "jardimluana", password: "senha123" },
  { username: "jardimguaratiba", password: "senha123" },
  { username: "pingodagua", password: "senha123" },
  { username: "cabuis", password: "senha123" },
  { username: "sepetiba", password: "senha123" },
  { username: "tirolesa", password: "senha123" },
] as const;

const ADMIN_ACCOUNTS = [
  { username: "matheus", password: "matheus2026" },
  { username: "andreia", password: "andreia2026" },
] as const;

function parseArgs() {
  const args = process.argv.slice(2);
  const getNum = (flag: string, fallback: number) => {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx === args.length - 1) return fallback;
    const value = Number(args[idx + 1]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    baseUrl: (
      process.env.STRESS_BASE_URL ??
      args.find((a) => a.startsWith("http")) ??
      "http://localhost:3333"
    ).replace(/\/$/, ""),
    vus: getNum("--users", Number(process.env.STRESS_VUS) || 75),
    durationSec: getNum("--duration", Number(process.env.STRESS_DURATION) || 60),
    rampUpSec: getNum("--ramp-up", Number(process.env.STRESS_RAMP_UP) || 10),
    writes: args.includes("--writes"),
    readOnly: args.includes("--read-only"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Teste de estresse — festa-dos-bairros-api

Opções:
  --users <n>       Usuários virtuais simultâneos (padrão: 75, faixa 50–100)
  --duration <s>    Duração total em segundos (padrão: 60)
  --ramp-up <s>     Tempo para subir até N usuários (padrão: 10)
  --writes          Habilita POST/PATCH (pedidos, fichas, status) — use só em dev/staging
  --read-only       Apenas leitura (GET) — seguro para produção
  --help            Esta ajuda

Exemplos:
  bun run scripts/stress-test.ts
  bun run scripts/stress-test.ts --users 100 --duration 120 --writes
  STRESS_BASE_URL=https://api.exemplo.com bun run scripts/stress-test.ts --read-only
`);
}

function decodeJwtPayload(token: string): { user_id: number; sub: string } {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("JWT inválido");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, idx)]!;
}

function recordMetric(stats: Stats, metric: RequestMetric) {
  stats.total += 1;
  stats.latencies.push(metric.durationMs);
  if (metric.ok) stats.ok += 1;
  else stats.failed += 1;

  const key = `${metric.method} ${metric.path}`;
  const bucket = stats.byEndpoint.get(key) ?? {
    ok: 0,
    failed: 0,
    latencies: [] as number[],
  };
  bucket.latencies.push(metric.durationMs);
  if (metric.ok) bucket.ok += 1;
  else bucket.failed += 1;
  stats.byEndpoint.set(key, bucket);
}

async function request(
  stats: Stats,
  baseUrl: string,
  name: string,
  method: HttpMethod,
  path: string,
  options: {
    token?: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  } = {},
): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const url = new URL(path, baseUrl);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body != null) headers["Content-Type"] = "application/json";

  const started = performance.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
    const durationMs = performance.now() - started;
    const ok = response.status >= 200 && response.status < 300;

    let data: unknown;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    recordMetric(stats, {
      name,
      method,
      path: url.pathname,
      status: response.status,
      durationMs,
      ok,
      error: ok ? undefined : `${response.status} ${text.slice(0, 120)}`,
    });

    return { ok, status: response.status, data };
  } catch (error) {
    const durationMs = performance.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    recordMetric(stats, {
      name,
      method,
      path: url.pathname,
      status: 0,
      durationMs,
      ok: false,
      error: message,
    });
    return { ok: false, status: 0 };
  }
}

async function login(
  stats: Stats,
  baseUrl: string,
  username: string,
  password: string,
): Promise<{ token: string; userId: number } | null> {
  const result = await request(stats, baseUrl, "login", "POST", "/auth/login", {
    body: { username, password },
  });
  if (!result.ok || !result.data || typeof result.data !== "object") return null;

  const tokens = result.data as { access_token?: string };
  if (!tokens.access_token) return null;

  const payload = decodeJwtPayload(tokens.access_token);
  return { token: tokens.access_token, userId: payload.user_id };
}

async function resolveStallId(
  stats: Stats,
  baseUrl: string,
  token: string,
  userId: number,
  fallbackStallId: number | null,
): Promise<number | null> {
  const result = await request(
    stats,
    baseUrl,
    "stall-by-user",
    "GET",
    `/stalls/user/${userId}`,
    { token },
  );
  if (result.ok && result.data && typeof result.data === "object") {
    const stall = result.data as { id?: number };
    if (stall.id) return stall.id;
  }
  return fallbackStallId;
}

function createStats(): Stats {
  return {
    total: 0,
    ok: 0,
    failed: 0,
    latencies: [],
    byEndpoint: new Map(),
  };
}

async function bootstrapSessions(
  baseUrl: string,
  allStallIds: number[],
): Promise<Session[]> {
  const bootstrapStats = createStats();
  const accounts = [...STALL_ACCOUNTS, ...ADMIN_ACCOUNTS];
  const sessions: Session[] = [];

  for (const account of accounts) {
    const auth = await login(bootstrapStats, baseUrl, account.username, account.password);
    if (!auth) {
      console.warn(`⚠️  Login falhou: ${account.username}`);
      continue;
    }

    const isAdmin = ADMIN_ACCOUNTS.some((a) => a.username === account.username);
    const fallback =
      allStallIds.length > 0
        ? allStallIds[Math.floor(Math.random() * allStallIds.length)]!
        : null;

    const stallId = await resolveStallId(
      bootstrapStats,
      baseUrl,
      auth.token,
      auth.userId,
      isAdmin ? fallback : fallback,
    );

    sessions.push({
      username: account.username,
      token: auth.token,
      userId: auth.userId,
      stallId,
      isAdmin,
    });
  }

  return sessions;
}

type ProductRef = { id: number; stallId: number };

async function loadProducts(
  baseUrl: string,
  stallIds: number[],
): Promise<ProductRef[]> {
  const bootstrapStats = createStats();
  const products: ProductRef[] = [];

  for (const stallId of stallIds) {
    const result = await request(bootstrapStats, baseUrl, "products", "GET", "/products", {
      query: { stallId, limit: 50, page: 1 },
    });
    if (!result.ok || !result.data || typeof result.data !== "object") continue;

    const page = result.data as { content?: Array<{ id: number; stallId: number }> };
    for (const item of page.content ?? []) {
      products.push({ id: item.id, stallId: item.stallId ?? stallId });
    }
  }

  return products;
}

function pickSession(sessions: Session[]): Session {
  return sessions[Math.floor(Math.random() * sessions.length)]!;
}

function pickStallSession(sessions: Session[]): Session {
  const withStall = sessions.filter((s) => s.stallId != null);
  if (withStall.length === 0) return pickSession(sessions);
  return withStall[Math.floor(Math.random() * withStall.length)]!;
}

function pickAdmin(sessions: Session[]): Session | null {
  const admins = sessions.filter((s) => s.isAdmin);
  return admins.length > 0
    ? admins[Math.floor(Math.random() * admins.length)]!
    : null;
}

async function scenarioListProducts(
  stats: Stats,
  baseUrl: string,
  session: Session,
) {
  const stallId = session.stallId ?? 1;
  await request(stats, baseUrl, "list-products", "GET", "/products", {
    token: session.token,
    query: { stallId, limit: 50, page: 1 },
  });
}

async function scenarioListOrders(
  stats: Stats,
  baseUrl: string,
  session: Session,
) {
  await request(stats, baseUrl, "list-orders", "GET", "/orders", {
    token: session.token,
    query: {
      stallId: session.stallId ?? undefined,
      limit: 20,
      page: 1,
    },
  });
}

async function scenarioListStalls(stats: Stats, baseUrl: string) {
  await request(stats, baseUrl, "list-stalls", "GET", "/stalls");
}

async function scenarioPublicSite(stats: Stats, baseUrl: string) {
  await request(stats, baseUrl, "site-config", "GET", "/festa-site/config");
  await request(stats, baseUrl, "site-gallery", "GET", "/festa-site/gallery");
}

async function scenarioRefreshLogin(
  stats: Stats,
  baseUrl: string,
  session: Session,
) {
  const account = [...STALL_ACCOUNTS, ...ADMIN_ACCOUNTS].find(
    (a) => a.username === session.username,
  );
  if (!account) return;
  await login(stats, baseUrl, account.username, account.password);
}

async function scenarioCreateOrder(
  stats: Stats,
  baseUrl: string,
  session: Session,
  products: ProductRef[],
) {
  const stallProducts = products.filter((p) => p.stallId === session.stallId);
  const pool = stallProducts.length > 0 ? stallProducts : products;
  if (pool.length === 0) return;

  const product = pool[Math.floor(Math.random() * pool.length)]!;
  await request(stats, baseUrl, "create-order", "POST", "/orders", {
    body: {
      stallId: product.stallId,
      buyerName: `[STRESS] ${session.username}`,
      items: [{ productId: product.id, quantity: 1 }],
    },
  });
}

async function scenarioTokenSale(stats: Stats, baseUrl: string, session: Session) {
  await request(stats, baseUrl, "token-sale", "POST", "/token-sales", {
    token: session.token,
    body: {
      buyerName: `[STRESS] ${session.username}`,
      paymentMethod: "PIX",
      items: [{ fichaValue: 5, quantity: 2 }],
    },
  });
}

async function scenarioDashboard(
  stats: Stats,
  baseUrl: string,
  session: Session,
) {
  await request(stats, baseUrl, "dashboard-summary", "GET", "/dashboard/summary", {
    token: session.token,
  });
}

async function runScenario(
  stats: Stats,
  baseUrl: string,
  sessions: Session[],
  products: ProductRef[],
  writes: boolean,
) {
  const roll = Math.random();

  if (roll < 0.34) {
    await scenarioListProducts(stats, baseUrl, pickStallSession(sessions));
    return;
  }
  if (roll < 0.54) {
    await scenarioListOrders(stats, baseUrl, pickStallSession(sessions));
    return;
  }
  if (roll < 0.64) {
    await scenarioListStalls(stats, baseUrl);
    return;
  }
  if (roll < 0.72) {
    await scenarioPublicSite(stats, baseUrl);
    return;
  }
  if (roll < 0.80) {
    await scenarioRefreshLogin(stats, baseUrl, pickSession(sessions));
    return;
  }

  if (!writes) {
    await scenarioListProducts(stats, baseUrl, pickStallSession(sessions));
    return;
  }

  if (roll < 0.88) {
    await scenarioCreateOrder(stats, baseUrl, pickStallSession(sessions), products);
    return;
  }
  if (roll < 0.94) {
    await scenarioTokenSale(stats, baseUrl, pickSession(sessions));
    return;
  }

  const admin = pickAdmin(sessions);
  if (admin) {
    await scenarioDashboard(stats, baseUrl, admin);
  } else {
    await scenarioListOrders(stats, baseUrl, pickStallSession(sessions));
  }
}

async function workerLoop(
  stats: Stats,
  baseUrl: string,
  sessions: Session[],
  products: ProductRef[],
  writes: boolean,
  stopAt: number,
  thinkMs: number,
) {
  while (Date.now() < stopAt) {
    await runScenario(stats, baseUrl, sessions, products, writes);
    if (thinkMs > 0) {
      await Bun.sleep(thinkMs + Math.random() * thinkMs);
    }
  }
}

function printReport(
  stats: Stats,
  config: ReturnType<typeof parseArgs>,
  elapsedSec: number,
) {
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const rps = stats.total / elapsedSec;

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  Resultado do teste de estresse");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  URL:        ${config.baseUrl}`);
  console.log(`  VUs:        ${config.vus}`);
  console.log(`  Duração:    ${elapsedSec.toFixed(1)}s`);
  console.log(`  Escrita:    ${config.writes ? "sim (--writes)" : "não (somente leitura)"}`);
  console.log("──────────────────────────────────────────────────────");
  console.log(`  Requisições: ${stats.total}`);
  console.log(`  Sucesso:     ${stats.ok} (${((stats.ok / stats.total) * 100 || 0).toFixed(1)}%)`);
  console.log(`  Falhas:      ${stats.failed}`);
  console.log(`  RPS médio:   ${rps.toFixed(1)} req/s`);
  console.log("──────────────────────────────────────────────────────");
  console.log(`  Latência p50: ${percentile(sorted, 50).toFixed(0)} ms`);
  console.log(`  Latência p95: ${percentile(sorted, 95).toFixed(0)} ms`);
  console.log(`  Latência p99: ${percentile(sorted, 99).toFixed(0)} ms`);
  console.log(`  Latência max: ${sorted.at(-1)?.toFixed(0) ?? 0} ms`);
  console.log("──────────────────────────────────────────────────────");
  console.log("  Por endpoint:");

  const rows = [...stats.byEndpoint.entries()].sort(
    (a, b) => b[1].latencies.length - a[1].latencies.length,
  );

  for (const [endpoint, bucket] of rows) {
    const lat = [...bucket.latencies].sort((a, b) => a - b);
    const total = bucket.ok + bucket.failed;
    console.log(
      `  ${endpoint.padEnd(28)} n=${String(total).padStart(4)}  ok=${String(bucket.ok).padStart(4)}  p95=${percentile(lat, 95).toFixed(0).padStart(4)}ms`,
    );
  }

  console.log("══════════════════════════════════════════════════════\n");

  if (stats.failed > 0) {
    console.log(
      "⚠️  Houve falhas. Confira se a API está no ar, o seed foi executado e as credenciais batem.",
    );
  } else if (percentile(sorted, 95) > 2000) {
    console.log(
      "⚠️  p95 acima de 2s — considere revisar índices do Postgres ou recursos do servidor antes do evento.",
    );
  } else {
    console.log("✅  Teste concluído sem erros HTTP.");
  }
}

async function main() {
  const config = parseArgs();
  if (config.help) {
    printHelp();
    return;
  }

  const writes = config.writes && !config.readOnly;
  const stats = createStats();

  console.log("\n🚀 Iniciando teste de estresse");
  console.log(`   ${config.baseUrl} | ${config.vus} VUs | ${config.durationSec}s | ramp ${config.rampUpSec}s`);

  const health = await fetch(`${config.baseUrl}/stalls`).catch(() => null);
  if (!health?.ok) {
    console.error(
      `\n❌ API inacessível em ${config.baseUrl}. Suba com \`pnpm run dev\` e tente de novo.\n`,
    );
    process.exit(1);
  }

  const stallsData = (await health.json()) as Array<{ id: number }>;
  const stallIds = stallsData.map((s) => s.id);

  console.log(`   ${stallIds.length} barracas encontradas — autenticando contas do seed...`);

  const sessions = await bootstrapSessions(config.baseUrl, stallIds);
  if (sessions.length === 0) {
    console.error(
      "\n❌ Nenhuma sessão válida. Rode `pnpm run prisma:seed:bun` e confira usuários/senhas.\n",
    );
    process.exit(1);
  }

  const products = await loadProducts(config.baseUrl, stallIds);
  console.log(`   ${sessions.length} sessões | ${products.length} produtos carregados`);

  if (writes) {
    console.log(
      "   ⚠️  Modo escrita ativo: pedidos/fichas serão criados (buyerName prefixado com [STRESS]).",
    );
  }

  const stopAt = Date.now() + config.durationSec * 1000;
  const thinkMs = 300;
  const workers: Promise<void>[] = [];

  for (let i = 0; i < config.vus; i++) {
    const delayMs = (config.rampUpSec * 1000 * i) / config.vus;
    workers.push(
      (async () => {
        if (delayMs > 0) await Bun.sleep(delayMs);
        await workerLoop(
          stats,
          config.baseUrl,
          sessions,
          products,
          writes,
          stopAt,
          thinkMs,
        );
      })(),
    );
  }

  const started = performance.now();
  await Promise.all(workers);
  const elapsedSec = (performance.now() - started) / 1000;

  printReport(stats, { ...config, writes }, elapsedSec);

  if (stats.failed / stats.total > 0.05) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
