import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const USERNAME = process.env.BASIC_AUTH_USERNAME;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

const MESSAGE =
  "Authentication required. Please supply the correct username and password.";

/**
 * Prompt for basic auth credentials on all application routes.
 */
export function middleware(request: NextRequest) {
  // Skip protection if credentials are not configured.
  if (!USERNAME || !PASSWORD) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    try {
      const [, encodedCredentials] = authHeader.split(" ");
      const decoded = atob(encodedCredentials);
      const [user, pass] = decoded.split(":");

      if (user === USERNAME && pass === PASSWORD) {
        return NextResponse.next();
      }
    } catch {
      // fall through to unauthorized response
    }
  }

  return new NextResponse(MESSAGE, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/public).*)"],
};
