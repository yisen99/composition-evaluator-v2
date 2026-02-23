import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  return process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
}

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const targetPath = `/${pathSegments.join("/")}`;
  const targetUrl = new URL(targetPath + request.nextUrl.search, getBackendBaseUrl());

  const headers = new Headers(request.headers);
  headers.delete("host");

  const requestBody =
    request.method === "GET" || request.method === "HEAD" ? undefined : new Uint8Array(await request.arrayBuffer());

  const init: RequestInit = {
    method: request.method,
    headers,
    body: requestBody
  };

  try {
    const response = await fetch(targetUrl, init);
    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream request failed";
    return NextResponse.json(
      {
        detail: `Upstream service unavailable: ${message}`
      },
      { status: 502 }
    );
  }
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

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxy(request, context.params.path);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxy(request, context.params.path);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxy(request, context.params.path);
}
