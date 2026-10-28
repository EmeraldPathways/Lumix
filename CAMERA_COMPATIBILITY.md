# Original DC-G9 compatibility

This project targets the **2017 Panasonic Lumix DC-G9**, not the DC-G9M2/G9 II. Recipes describe manual settings for the camera's JPEG Photo Style processing. There is no direct install, arbitrary REAL TIME LUT import, or third-party camera app flow.

## Implemented control model

The shared capability engine is `src/lib/camera/g9.ts`; all recipes identify their model as `DC-G9` and are validated against their stated minimum firmware.

| Control | Modelled values | Notes |
| --- | --- | --- |
| Photo Style | Standard, Vivid, Natural, Monochrome, L.Monochrome, L.Monochrome D, Scenery, Portrait, Cinelike D, Cinelike V | L.Monochrome D requires firmware 1.1. |
| Contrast, Sharpness, Noise Reduction | −5 to +5, integer steps | Picture-quality controls. |
| Saturation | −5 to +5 on colour Photo Styles | Not offered for monochrome. |
| Color Tone and Filter Effect | −5 to +5 and Off/Yellow/Orange/Red/Green on Monochrome and L.Monochrome | Not offered for L.Monochrome D or colour styles. |
| Grain Effect | Off/Low/Standard/High on monochrome styles | Requires firmware 1.1; never assigned to colour recipes. |
| Highlight Shadow | Standard, Raise the contrast, Lower the contrast, Brighten dark areas | Discrete camera presets. |
| White Balance | AWB, AWBc, AWBw, Daylight, Cloudy, Shade, Incandescent, Flash, White Set 1–4, Color Temperature | AWBw requires firmware 2.0. Color Temperature uses 2500–10000 K in 100 K steps. |
| Exposure recommendation | −5 to +5 EV in 1/3 EV steps | Shooting advice, not a Photo Style parameter. |

Only the documented controls above appear in the model. Camera-dependent recording-mode behavior is called out in the setup guide; the capability model does not claim every option is available in every mode. The interface distinguishes Photo Style Custom1–Custom4 from mode-dial custom shooting positions and full camera configurations saved to SD card. The current WB-axis fine adjustment graph is documented in the G9 manual but omitted from recipe JSON until a supported numeric range and transfer representation can be established.

## Firmware

The project's firmware gates follow Panasonic's original G9 firmware history: L.Monochrome D and Grain Effect are modelled from firmware 1.1; AWBw is modelled from firmware 2.0. Version 2.7 is the latest listed G9 firmware in the source consulted for this implementation. Confirm the currently installed camera firmware before applying a recipe.

## Evidence policy

All 25 initial recipes are experimental and have zero original-camera verification records. A verified status requires a recorded physical DC-G9 test, firmware/lens/conditions/findings and control/result images belonging to the same pair. A browser preview is never evidence.

## Panasonic sources

- [Photo Style adjustments](https://help.na.panasonic.com/answers/how-to-adjust-the-picture-quality-by-adding-an-effect-photo-style-lumix-g-series/)
- [Original DC-G9 operating instructions, firmware v2.0](https://www.panasonic.com/content/dam/Panasonic/au/en/support_manual/lumix-cameras/DC-G9_user-manual-firmware-v2.0.pdf)
- [Original G9 firmware history](https://av.jpn.support.panasonic.com/support/global/cs/dsc/download/fts/dl/g9.html)
- [Save/Restore camera settings from SD card](https://help.na.panasonic.com/answers/how-to-save-and-restore-the-camera-settings-from-the-sd-card-dc-gh5-dc-gh5s-dc-g9/)

## SD-card setting files

Panasonic's Save/Restore function is a whole-camera configuration workflow using SD card slot 1, not a Photo Style recipe installer. File structure inspection/generation is experimental research only. This repository has no public binary writer, synthetic camera preset, firmware modification or automated card write path.

