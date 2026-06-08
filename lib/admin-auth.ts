import { cookies } from "next/headers";
import { createHash } from "crypto";

function computeToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? "";
  return createHash("sha256").update(`admin_session:${password}`).digest("hex");
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === computeToken();
}

export function generateAdminToken(): string {
  return computeToken();
}
