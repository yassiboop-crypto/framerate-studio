# FrameRate Studio v1.4.0 — Global Design Polish Report

## Scope
This release builds on v1.3.9 and applies a global CSS visual polish layer across the site rather than changing only the Arcade page.

## Changes
- Unified panel/control radii and softened panel shadows.
- Added subtle warm/cool ambient background lighting.
- Improved text rendering and selected-text colors.
- Added clear keyboard `:focus-visible` styling.
- Refined hover/active/disabled button feedback.
- Improved focus rings for inputs, selects, and textareas.
- Styled scrollbars for film strips and horizontally scrollable controls.
- Added small-screen spacing and hover behavior adjustments.
- Added reduced-motion support for users who request less motion.

## Validation
- Static JavaScript syntax checks and HTML inline script checks are run before packaging.
- ZIP integrity is checked after packaging.
- This is not a claim of live browser, Supabase, or TMDB end-to-end verification; those require running the project with the user's actual configuration.

## Upgrade
Copy the real `js/supabase-config.js` from the currently working installation into this package. This release is front-end-only and requires no SQL or Edge Function redeployment.
