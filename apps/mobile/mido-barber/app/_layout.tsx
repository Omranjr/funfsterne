// NativeWind's Tailwind entry. Imported here rather than in @funfsterne/core
// because the stylesheet is generated from THIS app's tailwind.config.js.
import "../global.css";
import { createAppRoot } from "@funfsterne/core";
import { brand } from "../src/brand";

/**
 * The entire app, in one line.
 *
 * Everything else this package owns is data: src/theme.ts, src/config.ts,
 * src/brand.ts and assets/. All behaviour lives in @funfsterne/core.
 */
export default createAppRoot(brand);
