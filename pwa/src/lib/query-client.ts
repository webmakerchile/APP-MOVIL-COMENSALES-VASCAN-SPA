import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
}

const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const path = (queryKey as string[]).join("/");
  const url = `${path}?_t=${Date.now()}`;
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 401) return null;
  await throwIfNotOk(res);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
