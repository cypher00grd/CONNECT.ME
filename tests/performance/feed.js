import http from 'k6/http';
import { check, sleep } from 'k6';

const apiUrl = __ENV.K6_API_URL || 'http://127.0.0.1:5002';
const token = __ENV.K6_AUTH_TOKEN || '';
const vus = Number(__ENV.K6_VUS || 10);
const duration = __ENV.K6_DURATION || '30s';

export const options = {
  scenarios: {
    authenticated_feeds: {
      executor: 'constant-vus',
      vus,
      duration
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  }
};

const headers = { Authorization: `Bearer ${token}` };
const endpoints = [
  '/api/rooms/feed',
  '/api/issues/feed',
  '/api/users/suggestions?tech=react&experienceLevel=mid'
];

export default function () {
  const endpoint = endpoints[__ITER % endpoints.length];
  const response = http.get(`${apiUrl}${endpoint}`, {
    headers,
    tags: {
      endpoint,
      cache_status: responseCacheStatusPlaceholder
    }
  });

  check(response, {
    'status is 200': (result) => result.status === 200,
    'response is successful': (result) => result.json('success') === true
  });
  sleep(0.2);
}

// k6 evaluates request tags before the response exists. Cache status is also
// captured in the server logs and comparison metadata instead of this tag.
const responseCacheStatusPlaceholder = 'observed-in-response';
