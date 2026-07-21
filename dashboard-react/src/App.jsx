import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AuthProvider } from "./lib/auth/AuthContext";
import { CityProvider } from "./lib/city/CityProvider";
import { PresentationModeProvider } from "./lib/presentation/PresentationModeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CityProvider>
          <PresentationModeProvider>
            <RouterProvider router={router} />
          </PresentationModeProvider>
        </CityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
