import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  return process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
}

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const targetPath = `/${pathSegments.join("/")}`;
  const targetUrl = new URL(targetPath + request.nextUrl.search, getBackendBaseUrl());

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text()
  };

  const response = await fetch(targetUrl, init);
  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

type RouteContext = {
  params: {
    path: string[];
  };
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxy(request, context.params.path);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxy(request, context.params.path);
}
