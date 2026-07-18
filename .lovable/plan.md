Add the existing `PwaInstallButton` component to the Settings page so users can install the PWA from there too.

Changes:
- Import `PwaInstallButton` in `src/routes/_authenticated/settings.tsx`.
- Place it inside the settings card, near the top-right or above the save button, using the same visibility rules already built into the component (shows only when the browser fires `beforeinstallprompt`, hides when installed/standalone).
- No changes to the button logic itself; reuse the shared component.

Verification:
- Build/typecheck passes.
- Button renders in Settings when install criteria are met and remains hidden otherwise.