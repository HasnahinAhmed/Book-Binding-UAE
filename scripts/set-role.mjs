// Gives an existing account a staff role. The person signs up on the website
// first with their own password; no default credentials exist.
// Usage: npm run user:role -- someone@example.com admin|staff|customer
import postgres from "postgres";

const [email, role] = process.argv.slice(2);
if (!email || !["admin", "staff", "customer"].includes(role ?? "")) {
  console.error("Usage: npm run user:role -- <email> <admin|staff|customer>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const rows = await sql`UPDATE "user" SET role = ${role}, updated_at = now() WHERE lower(email) = lower(${email}) RETURNING id`;
  if (!rows.length) {
    console.error(`No account found for ${email}. Ask them to sign up first.`);
    process.exitCode = 1;
  } else {
    // sign the account out everywhere so the new role applies on next sign-in
    await sql`DELETE FROM session WHERE user_id = ${rows[0].id}`;
    await sql`INSERT INTO audit_log (action, entity, entity_id, data) VALUES ('user.role.set', 'user', ${rows[0].id}, ${sql.json({ role, via: "cli" })})`;
    console.log(`${email} is now ${role}.`);
  }
} finally {
  await sql.end();
}
