import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleHelp, ShieldCheck } from "lucide-react";
import { GuideWizardLoader } from "@/components/guide-wizard-loader";
import { getPublishedRecipeBySlug } from "@/lib/db/recipes";

export const metadata: Metadata = {
  title: "Original G9 Camera Setup Guide",
  description: "Step-by-step guidance for setting film-inspired recipes on the original Panasonic Lumix DC-G9.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main className="page-container guide-page">
      <div className="page-kicker"><span className="eyebrow-line" /> ORIGINAL DC-G9 <span>·</span> CAMERA SETUP</div>
      <section className="guide-hero"><div><p className="eyebrow">Set it up by hand</p><h1>A recipe for the camera<br /><em>you can hold.</em></h1><p>Follow the steps with your G9 beside you. Nothing gets installed or transferred: this guide helps translate a recipe into the camera’s own menus.</p></div><div className="guide-hero-note"><BookOpen size={21} /><strong>Original G9 only</strong><span>Menu names below follow the DC-G9. The G9 II uses a different camera and feature set.</span></div></section>
      <Suspense fallback={<div className="empty-state">Loading camera guide…</div>}><GuideContext searchParams={searchParams} /></Suspense>

      <section className="guide-faq-grid" id="custom-styles"><div><p className="eyebrow">Three different things</p><h2>Slots, modes and saved setups.</h2><p>The G9 uses similar words for different camera features. Here is what each one actually stores.</p></div><div className="guide-explainer-cards"><article><span>01</span><h3>Custom Photo Style slots</h3><p>Custom1–Custom4 store adjusted Photo Style looks. This is where the recipe’s colour and tone settings live.</p></article><article><span>02</span><h3>Custom shooting modes</h3><p>The mode dial’s C positions recall groups of shooting settings. They are separate from the Photo Style Custom1–Custom4 slots.</p></article><article><span>03</span><h3>Save/Restore on SD card</h3><p>Panasonic’s Save/Restore Camera Setting function uses SD card slot 1 and stores broad camera configurations. It is not a recipe installer. The experimental file research remains unavailable for installation.</p></article></div></section>

      <section className="guide-troubleshooting"><div className="trouble-title"><CircleHelp size={20} /><div><p className="eyebrow">Troubleshooting</p><h2>Can’t find a setting?</h2></div></div><div className="trouble-grid"><article><strong>Check your firmware</strong><p>L.Monochrome D and Grain Effect were added in firmware 1.1. AWBw was added in 2.0.</p></article><article><strong>Check the shooting mode</strong><p>Move to a still-photo exposure mode such as P, A, S or M. Some options can be hidden or fixed in specialized recording modes.</p></article><article><strong>Check the Photo Style</strong><p>Saturation is for colour styles. Color Tone and Filter Effect are only available in compatible monochrome Photo Styles.</p></article></div></section>

      <section className="sd-research-notice"><ShieldCheck size={20} /><div><p className="eyebrow">Experimental SD-card research</p><h2>Not available for camera installation.</h2><p>We are documenting the G9’s official Save/Restore process. We do not generate or modify camera settings files. Any future export would require controlled hardware testing, including safe backup and restore checks.</p></div><Link href="/guide#custom-styles" aria-label="Read about camera setup distinctions"><ArrowUpRight size={17} /></Link></section>
      <div className="guide-source"><strong>Documentation basis</strong><span>Panasonic DC-G9 Operating Instructions, firmware v2.0 · Panasonic G9 firmware history</span><a href="https://www.panasonic.com/content/dam/Panasonic/au/en/support_manual/lumix-cameras/DC-G9_user-manual-firmware-v2.0.pdf" target="_blank" rel="noreferrer">Open the original G9 manual <ArrowUpRight size={13} /></a><a href="https://av.jpn.support.panasonic.com/support/global/cs/dsc/download/fts/dl/g9.html" target="_blank" rel="noreferrer">See Panasonic firmware history <ArrowUpRight size={13} /></a></div>
    </main>
  );
}

async function GuideContext({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const recipeSlug = typeof params.recipe === "string" ? params.recipe : undefined;
  const recipe = recipeSlug ? await getPublishedRecipeBySlug(recipeSlug) : undefined;
  return <GuideWizardLoader key={recipeSlug ?? "general"} slug={recipeSlug} publishedRecipe={recipe} />;
}
