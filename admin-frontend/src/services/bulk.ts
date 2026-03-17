export type BulkRequest = {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

export async function runBulkRequests(requests: BulkRequest[]) {
  const headers = {
    "Content-Type": "application/json",
  };

  await Promise.all(
    requests.map(({ url, method, body }) =>
      fetch(url, {
        method,
        credentials: "include",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      }),
    ),
  );
}
