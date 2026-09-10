import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
