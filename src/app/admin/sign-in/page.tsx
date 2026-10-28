import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminSignInForm } from "@/components/admin/sign-in-form";

export const metadata: Metadata = {
  title: "Administrator Sign In",
  robots: { index: false, follow: false },
};

export default function AdminSignInPage() {
  return <main className="page-container admin-page admin-auth-page">
    <Link href="/" className="text-link"><ArrowLeft size={14} /> Back to G9 Film Lab</Link>
    <section className="admin-auth-card"><p className="eyebrow">Protected workspace</p><h1>Administrator sign in.</h1><p>Recipe publication and editorial photographs can only be changed by an allowlisted administrator.</p><AdminSignInForm /></section>
  </main>;
}
