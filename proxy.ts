import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { getSignInPath, getSignUpPath } from "@/lib/auth-paths";

const isPublicRoute = createRouteMatcher([
  `${getSignInPath()}(.*)`,
  `${getSignUpPath()}(.*)`,
  "/api/liveblocks-auth",
  "/api/projects(.*)",
  "/__clerk/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
