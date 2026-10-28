"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getFavorites, toggleFavorite as toggleStoredFavorite } from "@/lib/local-library";

const CHANGE_EVENT = "g9-film-lab:favorites-change";

export function FavoriteButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [favorite, setFavorite] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getFavorites().then((favorites) => {
        if (active) {
          setFavorite(favorites.includes(slug));
          setLoaded(true);
        }
      }).catch(() => {
        if (active) { setMessage("Local favourites are unavailable in this browser."); setLoaded(true); }
      });
    };
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => { active = false; window.removeEventListener(CHANGE_EVENT, refresh); };
  }, [slug]);

  async function handleToggle() {
    try {
      const next = await toggleStoredFavorite(slug);
      setFavorite(next);
      setMessage(next ? "Added to favourites." : "Removed from favourites.");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setMessage("Local favourites are unavailable in this browser.");
    }
  }

  return (
    <>
      <button type="button" className={`favorite-button${compact ? " favorite-compact" : ""}${favorite ? " is-favorite" : ""}`} onClick={handleToggle} disabled={!loaded} aria-label={favorite ? "Remove from favourites" : "Add to favourites"} aria-pressed={favorite}>
        <Heart size={compact ? 17 : 18} fill={favorite ? "currentColor" : "none"} />{!compact && <span>{favorite ? "Saved" : "Favourite"}</span>}
      </button>
      <span className="sr-only" role="status">{message}</span>
    </>
  );
}
