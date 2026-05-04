import { SignUp } from "@clerk/nextjs";

import { AUTH_PAGE_CONTENT } from "@/components/auth/auth-page-content";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  getAfterSignUpPath,
  getSignInPath,
  getSignUpPath,
} from "@/lib/auth-paths";

export default function SignUpPage() {
  return (
    <AuthPageShell {...AUTH_PAGE_CONTENT}>
      <SignUp
        fallbackRedirectUrl={getAfterSignUpPath()}
        oauthFlow="popup"
        path={getSignUpPath()}
        routing="path"
        signInUrl={getSignInPath()}
      />
    </AuthPageShell>
  );
}
