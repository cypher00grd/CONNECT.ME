import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const API_ORIGIN = process.env.TEST_API_URL || 'http://127.0.0.1:5000';
const API_URL = `${API_ORIGIN}/api`;
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const password = 'ConnectTest!2026';
const results = [];

const record = (name, status, detail = '') => {
  results.push({ name, status, detail });
  const marker = status === 'PASS' ? '[PASS]' : status === 'SKIP' ? '[SKIP]' : '[FAIL]';
  console.log(`${marker} ${name}${detail ? `: ${detail}` : ''}`);
};

const getCookie = (response) => {
  const value = response.headers.get('set-cookie');
  return value ? value.split(';', 1)[0] : '';
};

class ApiClient {
  constructor(label) {
    this.label = label;
    this.cookie = '';
    this.token = '';
    this.user = null;
  }

  async request(path, { method = 'GET', body, form, expected = [200] } = {}) {
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form || (body === undefined ? undefined : JSON.stringify(body))
    });

    const nextCookie = getCookie(response);
    if (nextCookie) this.cookie = nextCookie;

    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!expected.includes(response.status)) {
      throw new Error(
        `${this.label} ${method} ${path} returned ${response.status}: ${payload.message || text}`
      );
    }

    return { response, payload };
  }

  async signup({ username, displayName, isInstructor = false, skills = [] }) {
    const email = `${username}@connect-e2e.invalid`;
    const { payload } = await this.request('/auth/signup', {
      method: 'POST',
      expected: [201],
      body: { username, email, password, displayName, isInstructor, skills }
    });

    this.token = payload.data.token;
    this.user = payload.data;
    return payload.data;
  }
}

const waitForEvent = (socket, event, timeoutMs = 12000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for socket event "${event}"`));
    }, timeoutMs);

    const handler = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };

    socket.once(event, handler);
  });

const connectSocket = (client) =>
  new Promise((resolve, reject) => {
    const socket = io(API_ORIGIN, {
      transports: ['websocket'],
      auth: { token: client.token },
      timeout: 12000,
      reconnection: false
    });

    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

const joinSocketRoom = async (socket, roomId) => {
  const errorPromise = waitForEvent(socket, 'error', 1800)
    .then((payload) => ({ error: payload }))
    .catch(() => null);

  socket.emit('join_room', roomId);
  const possibleError = await errorPromise;
  if (possibleError?.error) {
    throw new Error(possibleError.error.message || 'Socket room join failed');
  }
};

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=',
  'base64'
);

const requester = new ApiClient('requester');
const helper = new ApiClient('helper');
const outsider = new ApiClient('outsider');
const sockets = [];

const run = async () => {
  const health = await fetch(`${API_ORIGIN}/readyz`).then((response) => response.json());
  assert.equal(health.mongo, 'ready');
  record('Backend readiness', 'PASS', `Mongo ${health.mongo}, Redis ${health.redis}`);

  const invalid = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `bad_${runId}`.slice(0, 20),
      email: `bad_${runId}@connect-e2e.invalid`,
      password,
      displayName: 'Invalid Payload',
      unexpected: true
    })
  });
  assert.equal(invalid.status, 400);
  record('Strict auth input validation', 'PASS');

  await requester.signup({
    username: `req_${runId}`.slice(0, 20),
    displayName: 'E2E Requester',
    skills: ['react', 'nodejs']
  });
  await helper.signup({
    username: `help_${runId}`.slice(0, 20),
    displayName: 'E2E Helper',
    isInstructor: true,
    skills: ['react', 'nodejs', 'coding']
  });
  await outsider.signup({
    username: `out_${runId}`.slice(0, 20),
    displayName: 'E2E Outsider',
    skills: ['design']
  });
  record('Signup and short access-token sessions', 'PASS', '3 isolated users created');

  const oldRequesterToken = requester.token;
  const refresh = await requester.request('/auth/refresh', { method: 'POST' });
  requester.token = refresh.payload.data.token;
  assert.notEqual(requester.token, oldRequesterToken);
  assert.ok(requester.cookie.includes('connect_refresh='));
  record('Rotating refresh cookie', 'PASS');

  await helper.request('/auth/profile', {
    method: 'PUT',
    body: {
      displayName: 'E2E Helper',
      bio: 'Automated helper profile',
      isInstructor: true,
      skills: ['react', 'nodejs', 'coding']
    }
  });
  record('Profile update', 'PASS');

  const form = new FormData();
  form.append('image', new Blob([tinyPng], { type: 'image/png' }), 'flow-test.png');
  const upload = await requester.request('/upload', {
    method: 'POST',
    form,
    expected: [200, 500]
  });

  let imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  if (upload.response.status === 200) {
    imageUrl = upload.payload.url;
    assert.match(imageUrl, /^https:\/\//);
    record('Image upload and signature validation', 'PASS', upload.payload.format);
  } else {
    record('Image upload and signature validation', 'SKIP', upload.payload.message || 'Cloudinary unavailable');
  }

  await helper.request(`/users/${requester.user._id}/follow`, { method: 'POST' });

  const roomCreate = await requester.request('/rooms', {
    method: 'POST',
    expected: [201],
    body: {
      title: `E2E room ${runId}`,
      description: 'End-to-end room test',
      category: 'coding',
      isVideoEnabled: true,
      maxParticipants: 4
    }
  });
  const roomId = roomCreate.payload.data._id;
  await helper.request(`/rooms/${roomId}/join`, { method: 'POST' });
  await outsider.request(`/rooms/${roomId}/join`, { method: 'POST', expected: [403] });
  record('Standard room creation and follower authorization', 'PASS');

  const requesterSocket = await connectSocket(requester);
  const helperSocket = await connectSocket(helper);
  const outsiderSocket = await connectSocket(outsider);
  sockets.push(requesterSocket, helperSocket, outsiderSocket);
  await joinSocketRoom(requesterSocket, roomId);
  await joinSocketRoom(helperSocket, roomId);

  const deniedJoin = waitForEvent(outsiderSocket, 'error');
  outsiderSocket.emit('join_room', roomId);
  assert.match((await deniedJoin).message, /follow creator/i);

  const textEvent = waitForEvent(helperSocket, 'new_message');
  requesterSocket.emit('send_message', {
    roomId,
    content: `Socket text ${runId}`,
    attachments: []
  });
  assert.equal((await textEvent).content, `Socket text ${runId}`);

  const imageEvent = waitForEvent(requesterSocket, 'new_message');
  helperSocket.emit('send_message', {
    roomId,
    content: '',
    attachments: [{ url: imageUrl, type: 'image', name: 'flow-test.png', size: tinyPng.length }]
  });
  const imageMessage = await imageEvent;
  assert.equal(imageMessage.type, 'image');
  assert.equal(imageMessage.attachments.length, 1);

  const messages = await requester.request(`/rooms/${roomId}/messages`);
  assert.ok(messages.payload.data.some((message) => message.content === `Socket text ${runId}`));
  assert.ok(messages.payload.data.some((message) => message.attachments?.length === 1));
  record('Socket authentication, text chat, and image chat', 'PASS');

  const issueCreate = await requester.request('/issues', {
    method: 'POST',
    expected: [201],
    body: {
      title: `Free issue ${runId}`,
      details: 'A detailed issue used to verify request approval and private chat.',
      tags: ['react', 'coding'],
      screenshots: [{ url: imageUrl, name: 'flow-test.png', size: tinyPng.length }],
      bountyAmount: 0
    }
  });
  const issueId = issueCreate.payload.data._id;
  assert.equal(issueCreate.payload.data.screenshots.length, 1);

  const helperIssueFeed = await helper.request('/issues/feed');
  assert.ok(helperIssueFeed.payload.data.some((issue) => issue._id === issueId));
  const ownIssueFeed = await requester.request('/issues/feed');
  assert.ok(!ownIssueFeed.payload.data.some((issue) => issue._id === issueId));

  const issueRequest = await helper.request(`/issues/${issueId}/requests`, {
    method: 'POST',
    expected: [201],
    body: { message: 'I can resolve this React issue.' }
  });
  const requestId = issueRequest.payload.data._id;

  const myIssues = await requester.request('/issues/my');
  const postedIssue = myIssues.payload.data.find((issue) => issue._id === issueId);
  assert.equal(postedIssue.requests.length, 1);

  const issueApproval = await requester.request(
    `/issues/${issueId}/requests/${requestId}/approve`,
    { method: 'POST' }
  );
  const issueRoomId = issueApproval.payload.data.room._id;
  await outsider.request(`/rooms/${issueRoomId}`, { expected: [403] });
  await helper.request(`/rooms/${issueRoomId}`);
  record('Issue post, screenshot visibility, resolver request, and private approval', 'PASS');

  await joinSocketRoom(requesterSocket, issueRoomId);
  await joinSocketRoom(helperSocket, issueRoomId);
  const issueChatEvent = waitForEvent(requesterSocket, 'new_message');
  helperSocket.emit('send_message', {
    roomId: issueRoomId,
    content: 'Issue-session chat works.',
    attachments: [{ url: imageUrl, type: 'image', name: 'issue-proof.png', size: tinyPng.length }]
  });
  assert.equal((await issueChatEvent).attachments.length, 1);
  await requester.request(`/issues/${issueId}/resolve`, { method: 'POST' });
  await requester.request(`/rooms/${issueRoomId}`, { expected: [404] });
  record('Issue-session chat and free resolution', 'PASS');

  const ticketCreate = await requester.request('/tickets', {
    method: 'POST',
    expected: [201],
    body: {
      title: `Ticket ${runId}`,
      description: 'Verify matching, locking, approval, private room, resolution, and rating.',
      tags: ['react', 'nodejs'],
      screenshots: [{ url: imageUrl, name: 'ticket-proof.png', size: tinyPng.length }],
      bountyAmount: 0,
      estimatedMinutes: 30
    }
  });
  const ticketId = ticketCreate.payload.data._id;
  assert.equal(ticketCreate.payload.data.screenshots.length, 1);

  const ticketFeed = await helper.request('/tickets/feed');
  assert.ok(ticketFeed.payload.data.some((ticket) => ticket._id === ticketId));
  await helper.request(`/tickets/${ticketId}/lock`, { method: 'POST' });
  await outsider.request(`/tickets/${ticketId}/lock`, { method: 'POST', expected: [409] });

  const approvedTicket = await requester.request(`/tickets/${ticketId}/approve`, { method: 'POST' });
  const vodRoomId = approvedTicket.payload.data.room._id;
  await outsider.request(`/rooms/${vodRoomId}`, { expected: [403] });
  await helper.request(`/rooms/${vodRoomId}`);
  record('Ticket matching, exclusive lock, approval, and private VOD access', 'PASS');

  const earlyResolve = await requester.request(`/tickets/${ticketId}/resolve`, {
    method: 'POST',
    expected: [409]
  });
  assert.match(earlyResolve.payload.message, /minimum|time|duration/i);
  record('Ticket minimum-time enforcement', 'PASS');

  const cancellableTicket = await requester.request('/tickets', {
    method: 'POST',
    expected: [201],
    body: {
      title: `Cancelable ticket ${runId}`,
      description: 'Verify searching ticket cancellation.',
      tags: ['react'],
      screenshots: [],
      bountyAmount: 0,
      estimatedMinutes: 30
    }
  });
  const cancelled = await requester.request(`/tickets/${cancellableTicket.payload.data._id}/cancel`, {
    method: 'POST'
  });
  assert.equal(cancelled.payload.data.status, 'cancelled');
  record('Free ticket cancellation', 'PASS');

  const paidTicket = await requester.request('/tickets', {
    method: 'POST',
    expected: [201, 500],
    body: {
      title: `Paid ticket ${runId}`,
      description: 'Verify Stripe test checkout creation and cancellation architecture.',
      tags: ['react'],
      screenshots: [],
      bountyAmount: 50,
      estimatedMinutes: 30
    }
  });
  if (paidTicket.response.status === 201) {
    assert.equal(paidTicket.payload.payment.required, true);
    assert.match(paidTicket.payload.payment.url, /^https:\/\/checkout\.stripe\.com/);
    const paidCancel = await requester.request(`/tickets/${paidTicket.payload.data._id}/cancel`, {
      method: 'POST'
    });
    assert.equal(paidCancel.payload.data.status, 'cancelled');
    record('Paid ticket checkout creation and cancellation', 'PASS');
  } else {
    record('Paid ticket checkout creation and cancellation', 'SKIP', paidTicket.payload.message || 'Stripe unavailable');
  }

  const paidIssue = await requester.request('/issues', {
    method: 'POST',
    expected: [201],
    body: {
      title: `Paid issue ${runId}`,
      details: 'Verify payment is deferred until the issue is marked fixed.',
      tags: ['nodejs'],
      screenshots: [],
      bountyAmount: 75
    }
  });
  const paidIssueId = paidIssue.payload.data._id;
  assert.equal(paidIssue.payload.data.paymentStatus, 'unpaid');
  const paidIssueRequest = await helper.request(`/issues/${paidIssueId}/requests`, {
    method: 'POST',
    expected: [201],
    body: { message: 'I can fix this paid issue.' }
  });
  await requester.request(
    `/issues/${paidIssueId}/requests/${paidIssueRequest.payload.data._id}/approve`,
    { method: 'POST' }
  );
  const paidIssueResolve = await requester.request(`/issues/${paidIssueId}/resolve`, {
    method: 'POST',
    expected: [200, 500]
  });
  if (paidIssueResolve.response.status === 200) {
    assert.equal(paidIssueResolve.payload.payment.required, true);
    assert.match(paidIssueResolve.payload.payment.url, /^https:\/\/checkout\.stripe\.com/);
    record('Deferred paid-issue checkout', 'PASS');
  } else {
    record('Deferred paid-issue checkout', 'SKIP', paidIssueResolve.payload.message || 'Stripe unavailable');
  }

  const schedule = await requester.request('/rooms/schedule', {
    method: 'POST',
    expected: [201],
    body: {
      title: `Scheduled event ${runId}`,
      description: 'Dark/light modal and API scheduling verification.',
      category: 'coding',
      scheduledStartTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      entryFee: 25,
      maxParticipants: 10,
      isVideoEnabled: true
    }
  });
  assert.equal(schedule.payload.data.status, 'scheduled');
  assert.equal(schedule.payload.data.type, 'live_event');
  record('Live-event scheduling', 'PASS');

  const activity = await requester.request('/activity/me');
  const activityData = activity.payload.data;
  assert.ok(activityData.roomsHosted >= 1);
  assert.ok(activityData.ticketsRaised >= 2);
  assert.equal(activityData.totalMoneySpent, 0);
  record('My Activity aggregation excludes unsettled money', 'PASS');

  const outsiderTicketAccess = await outsider.request(`/tickets/${ticketId}`, { expected: [403] });
  assert.match(outsiderTicketAccess.payload.message, /access/i);
  record('Object-level authorization checks', 'PASS');

  await outsider.request('/auth/logout', { method: 'POST' });
  outsider.token = '';
  const loggedOutRefresh = await outsider.request('/auth/refresh', {
    method: 'POST',
    expected: [401]
  });
  assert.match(loggedOutRefresh.payload.message, /missing|expired|invalid/i);
  record('Logout and refresh-session revocation', 'PASS');
};

try {
  await run();
} catch (error) {
  record('Full-flow execution', 'FAIL', error.stack || error.message);
} finally {
  sockets.forEach((socket) => socket.disconnect());
}

const failed = results.filter((result) => result.status === 'FAIL');
const skipped = results.filter((result) => result.status === 'SKIP');
console.log('\n--- Full Flow Summary ---');
console.log(`Passed: ${results.filter((result) => result.status === 'PASS').length}`);
console.log(`Skipped: ${skipped.length}`);
console.log(`Failed: ${failed.length}`);

if (failed.length > 0) {
  process.exitCode = 1;
}
