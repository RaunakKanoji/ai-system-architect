import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getSignInPath } from "@/lib/auth-paths";

export default async function Home() {
  const { userId } = await auth();

  redirect(userId ? "/editor" : getSignInPath());
}
