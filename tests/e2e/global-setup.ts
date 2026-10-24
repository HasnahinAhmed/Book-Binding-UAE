import postgres from "postgres";

/** Clears auth rate-limit counters so repeated local runs can sign up. Test databases only. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) return;
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql`DELETE FROM rate_limit`;
  await sql.end();
}
