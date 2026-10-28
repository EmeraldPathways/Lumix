"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import type { G9RecipeSettings } from "@/lib/camera/g9";
import { renderG9PreviewCanvas } from "@/lib/preview/render";

const SAMPLE_IMAGE = "/g9-reference-photo.png";

export function PreviewWorkbench({ settings }: { settings: G9RecipeSettings }) {
  const [file, setFile] = useState<File | null>(null);
  const [divider, setDivider] = useState(52);
  const [exposureEV, setExposureEV] = useState(settings.suggestedExposureCompensation ?? 0);
  const [imageReady, setImageReady] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const sourceUrl = useMemo(() => {
    if (!file || typeof window === "undefined") return SAMPLE_IMAGE;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => () => {
    if (file && sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
  }, [file, sourceUrl]);

  useEffect(() => {
    let active = true;
    const image = new window.Image();
    image.onload = () => {
      if (!active) return;
      sourceRef.current = image;
      setImageReady(true);
      setError("");
    };
    image.onerror = () => {
      if (active) setError("Could not read this image. Try another JPEG.");
    };
    image.src = sourceUrl;
    return () => {
      active = false;
      sourceRef.current = null;
    };
  }, [sourceUrl]);

  useEffect(() => {
    if (!imageReady || !canvasRef.current || !sourceRef.current) return;
    try {
      renderG9PreviewCanvas(canvasRef.current, sourceRef.current, settings, exposureEV);
    } catch {
      window.setTimeout(() => setError("Preview rendering failed in this browser. Your recipe settings are still available."), 0);
    }
  }, [imageReady, settings, exposureEV]);

  function handleFile(fileToLoad?: File) {
    if (!fileToLoad) return;
    if (fileToLoad.type !== "image/jpeg") {
      setError("Choose a JPEG image. The file stays in this browser and is not uploaded.");
      return;
    }
    if (fileToLoad.size > 12 * 1024 * 1024) {
      setError("This JPEG is larger than 12 MB. Resize it locally and try again to protect mobile memory.");
      return;
    }
    setError("");
    setImageReady(false);
    sourceRef.current = null;
    setFile(fileToLoad);
  }

  function resetImage() {
    setError("");
    setImageReady(false);
    sourceRef.current = null;
    setFile(null);
  }

  return (
    <div className="preview-workbench">
      <div className="preview-workbench-head"><div><p className="eyebrow">Local preview</p><h2>Same scene, new recipe.</h2></div><label className="upload-photo-button"><ImagePlus size={15} /><span>{file ? "Change JPEG" : "Upload a JPEG"}</span><input aria-label="Upload a JPEG for local preview" type="file" accept="image/jpeg,.jpg,.jpeg" onChange={(event) => handleFile(event.currentTarget.files?.[0])} /></label></div>
      <div className="studio-comparison" style={{ "--reveal": `${divider}%` } as React.CSSProperties}>
        <div className="studio-image-frame">
          <Image src={sourceUrl} alt={file ? "Your uploaded JPEG, original view" : "User-provided reference photograph, original view"} fill unoptimized sizes="(max-width: 760px) 95vw, 65vw" className="studio-source-image" />
          <div className="studio-preview-overlay" style={{ clipPath: "inset(0 calc(100% - var(--reveal)) 0 0)" }}><canvas ref={canvasRef} aria-label="Approximate recipe preview rendered locally in this browser" className="studio-preview-canvas" /></div>
          <span className="comparison-label before-label">Original</span><span className="comparison-label after-label">Approximate G9 direction</span>
          <span className="comparison-divider" aria-hidden="true" style={{ left: `${divider}%` }}><span /></span>
        </div>
        <label className="comparison-range"><span>Drag to compare</span><input aria-label="Move preview comparison divider" type="range" min="0" max="100" value={divider} onChange={(event) => setDivider(Number(event.currentTarget.value))} /></label>
      </div>
      <div className="preview-controls-row"><label className="preview-exposure">Preview exposure <input aria-label="Preview exposure compensation" type="range" min="-2" max="2" step="0.333333" value={exposureEV} onChange={(event) => setExposureEV(Number(event.currentTarget.value))} /><span>{exposureEV > 0 ? "+" : ""}{exposureEV.toFixed(1)} EV</span></label>{file && <button type="button" className="small-text-button" onClick={resetImage}><RotateCcw size={13} /> Use sample image</button>}</div>
      <p className="preview-disclaimer">{file ? "Your JPEG is processed locally in this browser. It is not automatically uploaded or saved." : "User-provided reference photograph; not a photograph captured on a Lumix G9."} The preview is an illustrative approximation, not Panasonic’s internal JPEG pipeline.</p>
      {error && <p className="preview-error" role="alert">{error}</p>}
      {!imageReady && !error && <p className="preview-loading" aria-live="polite">Preparing local preview…</p>}
    </div>
  );
}
