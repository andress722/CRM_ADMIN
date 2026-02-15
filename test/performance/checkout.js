import http from 'k6/http';
import { check, sleep, fail } from 'k6';

const rawBaseUrl = __ENV.API_BASE_URL || 'http://localhost:5071';
const apiBase = rawBaseUrl.replace(/\/+$/, '');
const baseUrl = apiBase.endsWith('/api/v1') ? apiBase : `${apiBase}/api/v1`;
const authToken = __ENV.AUTH_TOKEN;
const productId = __ENV.PRODUCT_ID || 'prod-123';
const shippingAddressId = __ENV.SHIPPING_ADDRESS_ID || 'addr-456';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  if (!authToken) {
    fail('AUTH_TOKEN env var is required to run the checkout perf test.');
  }

  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  const cartRes = http.get(`${baseUrl}/carts`, { headers });
  check(cartRes, {
    'cart status is 200': (r) => r.status === 200,
    'cart response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  const orderRes = http.post(
    `${baseUrl}/orders`,
    JSON.stringify({
      items: [{ productId, quantity: 2 }],
      shippingAddressId,
    }),
    { headers }
  );

  check(orderRes, {
    'order creation status is 201': (r) => r.status === 201,
    'order response time < 300ms': (r) => r.timings.duration < 300,
  });

  const orderId = orderRes.json('id');
  if (!orderId) {
    sleep(2);
    return;
  }

  sleep(1);

  const paymentRes = http.post(
    `${baseUrl}/payments`,
    JSON.stringify({
      orderId,
      amount: 100,
      method: 'card',
    }),
    { headers }
  );

  check(paymentRes, {
    'payment status is 201': (r) => r.status === 201,
    'payment response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(2);
}
