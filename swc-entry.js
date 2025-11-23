/**
 * CutMark - Photoshop UXP Plugin
 * 
 * Copyright (c) 2025 stechdrive
 * Released under the MIT license
 */

// swc-entry.js
// -----------------------------------------------------------------------------
// SWC (Spectrum Web Components) registration entry for UXP (safe subset).
// - Keep only Accordion-related components to avoid matchMedia-dependent overlays.
// - Load UXP wrappers first (theme/base/styles).
// -----------------------------------------------------------------------------

import "@swc-uxp-wrappers/utils";

// Accordion (safe)
import "@spectrum-web-components/accordion/sp-accordion.js";
import "@spectrum-web-components/accordion/sp-accordion-item.js";

// Optional debug flag to verify the bundle is loaded.
try { window.__CUTMARK_SWC_ENV__ = "ready"; } catch (_) { /* noop for non-UXP */ }
