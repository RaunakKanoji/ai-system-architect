import { SignIn } from "@clerk/nextjs";

import { AUTH_PAGE_CONTENT } from "@/components/auth/auth-page-content";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  getAfterSignInPath,
  getSignInPath,
  getSignUpPath,
} from "@/lib/auth-paths";

export default function SignInPage() {
  return (
    <AuthPageShell {...AUTH_PAGE_CONTENT}>
      <SignIn
        fallbackRedirectUrl={getAfterSignInPath()}
        oauthFlow="popup"
        path={getSignInPath()}
        routing="path"
        signUpUrl={getSignUpPath()}
      />
    </AuthPageShell>
  );
}
