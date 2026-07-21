import { createContext } from "react";

// Bare createContext, no hook/component logic here — same 3-file split as
// lib/city/cityContextObject.js, for the same reason: keeps this file
// Fast-Refresh-safe (a file that only exports a component or only exports
// non-component values hot-reloads cleanly; mixing both in one file is
// what breaks Vite's Fast Refresh).
export const PresentationModeContext = createContext(null);
