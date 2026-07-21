import { createContext } from "react";

// The raw context object, split into its own file so AuthContext.jsx can
// export ONLY the AuthProvider component and useAuth.js can export ONLY
// the hook — React Fast Refresh can't hot-patch a file that mixes a
// component export with a non-component export, and a file exporting a
// bare createContext() result alongside a component hit exactly that case
// (see the "Could not Fast Refresh" HMR invalidation this used to log).
export const AuthContext = createContext(null);
