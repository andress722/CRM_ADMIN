export type BulkRequest = {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

export async function runBulkRequests(requests: BulkRequest[], token: string) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  await Promise.all(
    requests.map(({ url, method, body }) =>
      fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      }),
    ),
  );
}
