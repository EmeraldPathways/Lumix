"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { G9SetupWizard } from "@/components/g9-setup-wizard";
import { getPersonalRecipe } from "@/lib/local-library";
import { resolveSetupRecipe } from "@/lib/guide/resolve-recipe";
import type { G9Recipe } from "@/lib/recipes/schema";

export function GuideWizardLoader({ slug, publishedRecipe }: { slug?: string; publishedRecipe?: G9Recipe }) {
  const [recipe, setRecipe] = useState<G9Recipe | undefined>(() => publishedRecipe?.slug === slug ? publishedRecipe : undefined);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    if (!slug) return () => { active = false; };

    void resolveSetupRecipe(slug, publishedRecipe, getPersonalRecipe)
      .then((resolved) => {
        if (!active) return;
        setRecipe(resolved);
        if (!resolved) setStatus("This recipe was not found among published recipes or in this browser’s local library.");
      })
      .catch(() => {
        if (active) setStatus("Could not open local recipe storage. Reopen My Recipes and try again on this device.");
      });

    return () => { active = false; };
  }, [publishedRecipe, slug]);

  return <>
    {recipe && <div className="guide-selected-recipe"><Camera size={16} /> Setting up <strong>{recipe.title}</strong>{recipe.published ? null : <span>· Local copy</span>}</div>}
    {status && <p className="guide-recipe-status" role="status">{status}</p>}
    <G9SetupWizard recipe={recipe} />
  </>;
}
