import { SignUp } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  getAfterSignOutPath,
  getAfterSignUpPath,
  getSignInPath,
  getSignUpPath,
} from "@/lib/auth-paths";

export default function SignUpPage() {
  return (
    <AuthPageShell
      title="Design systems at the speed of thought."
      description="Describe your architecture in plain English. Ghost AI maps it to a shared canvas your whole team can refine in real time."
      features={[
        {
          title: "AI Architecture Generation",
          description:
            "Describe your system, AI maps it to nodes and edges on a live canvas.",
        },
        {
          title: "Real-time Collaboration",
          description:
            "Live cursors, presence indicators, and shared node editing across your team.",
        },
        {
          title: "Instant Spec Generation",
          description:
            "Export a complete Markdown technical spec directly from the canvas graph.",
        },
      ]}
    >
      <SignUp
        afterSignOutUrl={getAfterSignOutPath()}
        fallbackRedirectUrl={getAfterSignUpPath()}
        oauthFlow="popup"
        path={getSignUpPath()}
        routing="path"
        signInUrl={getSignInPath()}
      />
    </AuthPageShell>
  );
}
