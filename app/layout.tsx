import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import {
  getAfterSignInPath,
  getAfterSignOutPath,
  getAfterSignUpPath,
} from "@/lib/auth-paths";
import "@xyflow/react/dist/style.css";
import "@liveblocks/react-flow/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Collaborative system design workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider
          signInFallbackRedirectUrl={getAfterSignInPath()}
          signUpFallbackRedirectUrl={getAfterSignUpPath()}
          afterSignOutUrl={getAfterSignOutPath()}
          appearance={{
            theme: shadcn,
            variables: {
              fontFamily: "var(--font-geist-sans)",
              fontFamilyMono: "var(--font-geist-mono)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
