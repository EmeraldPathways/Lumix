import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Database, ShieldAlert } from "lucide-react";
import { AdminDashboard } from "@/components/admin/dashboard";
import { AdminSignOutButton } from "@/components/admin/sign-out-button";
import { getAdminAccess } from "@/lib/admin/access";
import { seedRecipes } from "@/lib/recipes/seed";
import { listAdminRecipes } from "@/lib/db/admin";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (access.status === "unauthenticated") redirect("/admin/sign-in");
  if (access.status === "forbidden") return <AdminStatus title="This identity is not authorized." detail="Ask the site owner to add your email to the server-side administrator allowlist." />;
  if (access.status === "unconfigured") return <AdminStatus title="Admin storage is not configured." detail="Set DATABASE_URL, BETTER_AUTH_SECRET, and ADMIN_EMAILS, then apply the Neon migrations. Public browsing and local recipe saving remain available." />;
  if (access.status === "unavailable") return <AdminStatus title="Admin is temporarily unavailable." detail="The Neon database or authentication session could not be checked. Review server logs and try again." />;
  let recipes: Awaited<ReturnType<typeof listAdminRecipes>>;
  try { recipes = await listAdminRecipes(); }
  catch (error) {
    console.error("Could not load the administrator catalogue", error);
    return <AdminStatus title="The recipe catalogue is not ready." detail="Apply the database migrations and seed the initial recipe collection, then reopen this page." />;
  }
  return <main className="page-container admin-page">
    <header className="admin-topbar"><div><p className="eyebrow">Editorial workspace</p><h1>G9 Film Lab admin</h1></div><div><span className="admin-identity">{access.actor.email}</span><AdminSignOutButton /></div></header>
    <AdminDashboard initialRecipes={recipes} template={seedRecipes[0]} />
  </main>;
}

function AdminStatus({ title, detail }: { title: string; detail: string }) {
  return <main className="page-container admin-page admin-status-page"><div className="admin-status-card"><ShieldAlert size={26} /><p className="eyebrow">Protected administrator area</p><h1>{title}</h1><p>{detail}</p><Link className="text-link" href="/"><ArrowLeft size={14} /> Back to public site</Link><p className="admin-status-footnote"><Database size={14} /> Administrator content is never served from a client-side write key.</p></div></main>;
}
