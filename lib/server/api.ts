import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./auth";

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Turn thrown HttpErrors into responses and log anything unexpected. */
export function route(handler: Handler): Handler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
  };
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function text(body: string, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
