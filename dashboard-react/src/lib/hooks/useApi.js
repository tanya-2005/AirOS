import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAttribution,
  getForecast,
  getEnforcement,
  getRegistry,
  postSimulate,
} from "../api/endpoints";

// Thin react-query wrappers, one per resource, shared by every page that
// needs it (Command Center + Attribution both use attribution data, etc.)
// so the network request is de-duped and cached instead of re-fetched per page.

const STALE_TIME = 60_000;

export function useAttribution() {
  return useQuery({
    queryKey: ["attribution"],
    queryFn: ({ signal }) => getAttribution(signal),
    staleTime: STALE_TIME,
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: ({ signal }) => getForecast(signal),
    staleTime: STALE_TIME,
  });
}

export function useEnforcement() {
  return useQuery({
    queryKey: ["enforcement"],
    queryFn: ({ signal }) => getEnforcement(signal),
    staleTime: STALE_TIME,
  });
}

export function useRegistry() {
  return useQuery({
    queryKey: ["registry"],
    queryFn: ({ signal }) => getRegistry(signal),
    staleTime: STALE_TIME,
  });
}

export function useSimulate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenario) => postSimulate(scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enforcement"] });
    },
  });
}
