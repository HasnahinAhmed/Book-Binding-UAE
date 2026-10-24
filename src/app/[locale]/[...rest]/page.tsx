import { notFound } from "next/navigation";

/** Any unknown path under a locale shows the localised 404 page. */
export default function CatchAll() {
  notFound();
}
