import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Reachable without signing in. Everything else requires a session. */
const PUBLIC_PATHS = ["/", "/login", "/signup"];

/** Where a signed-in but not-yet-approved member is allowed to go. */
const WAITING_ROOM_PATHS = ["/onboarding", "/pending"];

const isUnder = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not put code between createServerClient and getClaims() — it makes
  // random logout bugs very hard to track down.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!user) {
    return isUnder(pathname, PUBLIC_PATHS) ? supabaseResponse : redirectTo("/login");
  }

  // ponytail: one indexed PK lookup per request instead of mirroring status into
  // the JWT via a custom access token hook. The hook would save the query but the
  // claim goes stale until the token refreshes, so a member who was just approved
  // would keep seeing the waiting room. Revisit only if this shows up in traces.
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, admin_role, is_profile_complete")
    .eq("id", user.sub)
    .maybeSingle();

  if (!profile) return supabaseResponse;

  if (pathname === "/login" || pathname === "/signup") {
    return redirectTo(profile.status === "approved" ? "/dashboard" : "/pending");
  }

  if (profile.status !== "approved") {
    if (isUnder(pathname, WAITING_ROOM_PATHS) || pathname === "/") return supabaseResponse;
    return redirectTo(profile.is_profile_complete ? "/pending" : "/onboarding");
  }

  // Approved members have no reason to sit in the waiting room.
  if (isUnder(pathname, WAITING_ROOM_PATHS)) return redirectTo("/dashboard");

  // Redirecting here is a UX nicety. RLS is what actually protects admin data.
  if (isUnder(pathname, ["/admin"]) && !profile.admin_role) return redirectTo("/dashboard");

  // Must be returned as-is, cookies intact, or the browser and server drift out
  // of sync and the session dies early.
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
