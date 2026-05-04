export function getAuthPath(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  try {
    return new URL(value).pathname;
  } catch {
    return value.startsWith("/") ? value : fallback;
  }
}

export function getSignInPath() {
  return getAuthPath(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL, "/sign-in");
}

export function getSignUpPath() {
  return getAuthPath(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL, "/sign-up");
}

export function getAfterSignInPath() {
  return getAuthPath(
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
    "/editor"
  );
}

export function getAfterSignUpPath() {
  return getAuthPath(
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
    "/editor"
  );
}

export function getAfterSignOutPath() {
  return getAuthPath(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL, "/sign-in");
}
