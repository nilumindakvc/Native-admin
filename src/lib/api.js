import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildQuery(params) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.append(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, { params, body } = {}) {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const res = await fetch(`${BASE}${path}${buildQuery(params)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const detail =
      (payload && (payload.detail || payload.message)) ||
      (typeof payload === "string" ? payload : null) ||
      `Request failed (${res.status})`;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
      : detail;
    throw new ApiError(message, res.status);
  }
  return payload;
}

export const api = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body, params) => request("POST", path, { body, params }),
  patch: (path, body, params) => request("PATCH", path, { body, params }),
  del: (path, params) => request("DELETE", path, { params }),
};
