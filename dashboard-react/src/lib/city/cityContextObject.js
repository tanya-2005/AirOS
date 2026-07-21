import { createContext } from "react";

// Split into its own file for the same reason lib/auth/authContextObject.js
// is — a file mixing a component export with a plain object export defeats
// React Fast Refresh (see that file's comment for the full story).
export const CityContext = createContext(null);
