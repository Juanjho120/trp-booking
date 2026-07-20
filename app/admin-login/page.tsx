import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { siteConfig } from "@/config/site";
import { AdminSignInPage } from "@/features/auth";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { esMessages } from "@/messages";

type AdminLoginPageProps = Readonly<{
  searchParams: Promise<Readonly<{ callbackUrl?: string | string[] }>>;
}>;

function resolveAdminRedirect(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return "/admin";
  }

  try {
    const candidate = new URL(rawValue, siteConfig.url);
    const isAdminRoute =
      candidate.pathname === "/admin" || candidate.pathname.startsWith("/admin/");

    if (!isAdminRoute) {
      return "/admin";
    }

    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return "/admin";
  }
}

export const metadata: Metadata = {
  title: esMessages.seo.adminSignIn.title,
  description: esMessages.seo.adminSignIn.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const redirectTo = resolveAdminRedirect(params.callbackUrl);

  if (session?.user?.role === ADMIN_ROLE) {
    redirect(redirectTo);
  }

  async function signInWithGoogle() {
    "use server";

    await signIn("google", { redirectTo });
  }

  return <AdminSignInPage signInAction={signInWithGoogle} />;
}
