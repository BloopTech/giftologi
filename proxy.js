import { middlewareClient } from "./app/utils/supabase/middleware";


export async function proxy(request) {
  // Admin routes protection
  // if (request.nextUrl.pathname.startsWith("/admin")) {
  //   return adminAuthMiddleware(request);
  // }

  //console.log("note...............", request);
  const response = await middlewareClient(request);
  return response;

}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
