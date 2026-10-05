"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 60_000,
          },
        },
      })
  );
  // Any API call that answers 403 { code: "INACTIVE" } switches the app to the Inactive screen.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        const d = error?.response?.data;
        if (error?.response?.status === 403 && d?.code === "INACTIVE") {
          useAuthStore.getState().setInactive({ message: d.error, reason: d.reason ?? null });
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
