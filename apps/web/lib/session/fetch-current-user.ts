import type { CurrentUser } from "@orbix/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Nunca confia no JWT decodificado no cliente para tenant_id/role — sempre pede
// pro backend resolver (docs/09-api.md, 9.2).
export async function fetchCurrentUser(accessToken: string): Promise<CurrentUser | null> {
  const response = await fetch(`${API_URL}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;
  return (await response.json()) as CurrentUser;
}
