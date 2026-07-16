import { NextResponse } from "next/server";

export function adminApiErrorResponse(code: string, status: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
      },
    },
    {
      status,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

export function adminApiSuccessResponse<T extends object>(payload: T): NextResponse {
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
