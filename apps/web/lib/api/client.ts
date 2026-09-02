import { supabase } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Sempre pega o token da sessão atual do Supabase (não guarda em estado React
// separado) — supabase-js renova o token sozinho, então isso nunca manda um
// access_token expirado (docs/09-api.md, 9.2).
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const message =
      typeof body?.message === "string" ? body.message : `Erro ${response.status} ao chamar a API.`;
    throw new ApiError(response.status, message);
  }

  // Nest não usa 204 por padrão pra controller que não retorna nada (ex:
  // DELETE de produto) — devolve 200 com corpo vazio. Checar o texto antes de
  // fazer .json() evita "Unexpected end of JSON input" nesses casos.
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
