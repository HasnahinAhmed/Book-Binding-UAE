import "server-only";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { currentSession, roleOf, type Session } from "@/lib/auth";

/** Staff-only pages. Signed-out visitors go to sign-in; customers get a 404 so the area isn't advertised. */
export async function requireStaffPage(locale: string, next: string): Promise<Session> {
  const session = await currentSession();
  if (!session) return redirect({ href: `/account/sign-in?next=${encodeURIComponent(next)}`, locale });
  const role = roleOf(session);
  if (role !== "staff" && role !== "admin") notFound();
  return session;
}
