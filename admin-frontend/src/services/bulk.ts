import { authFetch } from './auth-fetch';

export type BulkRequest = {
  url: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
};

export async function runBulkRequests(requests: BulkRequest[], _token: string) {
  void _token;
  await Promise.all(
    requests.map(({ url, method, body }) =>
      authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    )
  );
}
