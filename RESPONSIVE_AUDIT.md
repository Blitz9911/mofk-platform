# Responsive Audit

## Scope

Reviewed responsive readiness for the web shell, marketing routes, app dashboard routes, admin routes, and Expo app configuration by static code inspection. Browser screenshots were not captured because local typecheck/build could not complete in this network-restricted environment.

## Required Viewports

The following viewports must be verified manually or in CI with Playwright before release:

- `320x568`
- `375x667`
- `390x844`
- `430x932`
- `768x1024`
- `820x1180`
- `1024x768`
- `1280x720`
- `1366x768`
- `1440x900`
- `1920x1080`
- `2560x1440`
- `3840x2160`

## Findings

- The web app already uses Tailwind responsive utilities, grids, and max-width containers in many pages.
- Several tables use local horizontal scroll containers, which is preferred over page-level horizontal scrolling.
- Some dense admin and subscription pages still need real viewport verification on `320px` and split-screen tablet widths.
- The Expo app was configured as portrait-only and iPhone-only before this pass.
- Global focus state was not centralized.

## Changes Implemented

- Added global `overflow-x: clip` guard on `html`, `body`, and `#root`.
- Added `min-width: 0` baseline to reduce flex/grid overflow issues.
- Added visible global `:focus-visible` outline.
- Added media max-width guards for `img`, `svg`, `canvas`, and `video`.
- Changed Expo orientation to `default`.
- Enabled iOS tablet support in Expo.

## Horizontal Overflow Status

Static CSS safeguards are now in place. Full confirmation still requires browser inspection at the required viewport list.

## Device Class Status

| Class | Status |
| --- | --- |
| Small phones | Needs browser verification |
| Large phones | Needs browser verification |
| Tablets / iPad | Improved, needs real device or simulator verification |
| Laptop | Static layout appears supported |
| Desktop | Static layout appears supported |
| 2K / 4K | Needs visual verification for over-wide content density |
| Smart TV | Focus-visible improved; arrow-key navigation still needs manual verification |

## Remaining Work

- Add Playwright responsive smoke tests for public pricing, login, dashboard, vehicles, subscription, admin users, and admin vehicles.
- Capture before/after screenshots for the required viewports.
- Convert any remaining wide data tables to mobile card views where horizontal scrolling is not ergonomic.
- Verify Arabic long strings, numeric overflow, dialogs, forms, and bottom fixed bars at `320px`.
