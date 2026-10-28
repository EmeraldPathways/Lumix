# SD-card preset research

**Status: Experimental research — not available for camera installation.**

Panasonic documents Save/Restore Camera Setting for the original DC-G9 through `MENU → Setup → Save/Restore Camera Setting`; the feature uses SD card slot 1 and stores complete camera configurations. Panasonic documents a maximum of ten saved configurations per card. This is broader than Photo Style and could change unrelated camera setup.

No G9 hardware, user-saved setting files, repeatable binary fixtures, integrity/checksum specification or safe partial-setting writer is available in this repository. The actual configuration structure has not been reverse engineered or independently confirmed. The app therefore does not inspect uploaded camera files, modify card contents, generate binary configurations, or describe any JSON export as a camera preset.

Research may proceed only with user-owned files and local-only analysis. A controlled study would save a baseline in camera, change exactly one documented setting, save again, compare files, repeat across known firmware versions, and restore the backups on original DC-G9 hardware. Any future install/export would need documented integrity handling, checks for unrelated state, backup and recovery instructions, and successful physical camera verification. Until those conditions are met, public installation must remain disabled.

Source: [Panasonic Save/Restore camera settings documentation](https://help.na.panasonic.com/answers/how-to-save-and-restore-the-camera-settings-from-the-sd-card-dc-gh5-dc-gh5s-dc-g9/).

