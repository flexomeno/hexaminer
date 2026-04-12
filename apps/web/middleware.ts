import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isAdminEmail, isPrivateSiteEnabled } from "@/lib/admin-config";

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith("/admin")) {
      const email = req.nextauth.token?.email as string | undefined;
      if (!isAdminEmail(email)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;
        if (p.startsWith("/admin")) {
          return !!token;
        }
        if (!isPrivateSiteEnabled()) {
          return true;
        }
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/", "/camera", "/dashboard/:path*", "/admin/:path*"],
};
