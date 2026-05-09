/**
 * Seed the backend's Postgres with:
 *   - 3 demo users (Alice, Bob, Carol)
 *   - 30 000 mock agents with random scenario tags + profile vectors
 *
 * Run with:  pnpm tsx scripts/seed_demo_data.ts
 */

import { Client } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://veranda:veranda@localhost:5432/veranda";

const SCENARIOS = [
  "casual_dining",
  "work_colleagues",
  "family_interaction",
  "conflict_resolution",
  "travel_companion",
];

function randomScenarios(): string[] {
  const count = 2 + Math.floor(Math.random() * 3); // 2..4
  const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomVector(): number[] {
  return Array.from({ length: 5 }, () => +Math.random().toFixed(4));
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("▶ Seeding demo users…");
  for (const [privy_user_id, real_wallet, name] of [
    ["did:privy:dev:alice", "AliceReal111111111111111111111111111111111", "Alice"],
    ["did:privy:dev:bob", "BobReal11111111111111111111111111111111111", "Bob"],
    ["did:privy:dev:carol", "CarolReal1111111111111111111111111111111111", "Carol"],
  ]) {
    await client.query(
      `INSERT INTO users (privy_user_id, real_wallet)
       VALUES ($1, $2) ON CONFLICT (privy_user_id) DO NOTHING`,
      [privy_user_id, real_wallet],
    );
    console.log(`  • ${name}`);
  }

  console.log("▶ Seeding 30 000 mock agents…");
  const POOL_SIZE = 30_000;
  const BATCH = 500;
  let inserted = 0;
  while (inserted < POOL_SIZE) {
    const values: string[] = [];
    const params: unknown[] = [];
    for (let i = 0; i < BATCH && inserted + i < POOL_SIZE; i++) {
      const idx = inserted + i;
      values.push(
        `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`,
      );
      params.push(
        `MockAgent${String(idx).padStart(6, "0")}`,
        true,
        randomScenarios(),
        JSON.stringify(randomVector()),
        `Anonymous candidate #${idx}`,
      );
    }
    await client.query(
      `INSERT INTO agents (agent_wallet, registered, scenarios, profile_vector, display_name)
       VALUES ${values.join(",")}
       ON CONFLICT (agent_wallet) DO NOTHING`,
      params,
    );
    inserted += BATCH;
    if (inserted % 5000 === 0) console.log(`  ${inserted} / ${POOL_SIZE}`);
  }

  await client.end();
  console.log("✅ Seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
