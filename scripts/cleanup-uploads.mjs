// Deletes uploaded PDFs that were never attached to an order, after 7 days.
// Run daily (cron / scheduled job): npm run uploads:cleanup
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const MAX_AGE_DAYS = Number(process.env.UPLOAD_RETENTION_DAYS ?? 7);
const dir = path.join(path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage/private"), "uploads");
const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
let removed = 0;
try {
  const names = await readdir(dir).catch(() => []);
  for (const name of names.filter((n) => /^[A-Za-z0-9_-]{22}\.json$/.test(n))) {
    const id = name.slice(0, -5);
    const meta = JSON.parse(await readFile(path.join(dir, name), "utf8"));
    if (Date.parse(meta.createdAt) > cutoff) continue;
    const [row] = await sql`SELECT 1 FROM order_files WHERE upload_id = ${id}`;
    if (row) continue;
    await rm(path.join(dir, `${id}.pdf`), { force: true });
    await rm(path.join(dir, name), { force: true });
    removed++;
  }
  console.log(`removed ${removed} unattached upload(s) older than ${MAX_AGE_DAYS} days`);
} finally {
  await sql.end();
}
