# Connect.dev

Connect.dev is a real-time collaboration platform for engineers. Developers can create live sessions, post coding issues, request 1-on-1 help, chat, share images, join video calls, and collaborate around debugging, code review, pair programming, system design, DevOps, security, mobile, data, and DSA topics.

## Core Features

- Developer-first live rooms with engineering categories.
- On-demand help tickets with skill matching, private sessions, ratings, and Stripe-powered bounties.
- Posted issues where resolvers can request access and join a private chat-first workspace after approval.
- Real-time chat, notifications, image attachments, and WebRTC video calls.
- Scheduled paid live events with booking/payment support.
- Activity dashboard for hosted/joined rooms, tickets, and settled money.
- Security-hardened backend with HttpOnly refresh cookies, short access tokens, rate limiting, validation, upload checks, and Stripe webhook idempotency.

## Tech Stack

- Frontend: React, Vite, Redux Toolkit, Tailwind CSS, Socket.IO client.
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO.
- Services: Stripe, Cloudinary, Redis-ready caching/realtime helpers.
- Deployment path: Vercel frontend and Render backend.

## Local Setup

### Backend

```bash
cd server
npm install
npm start
```

Required backend env values are documented in `server/.env.example`.

### Frontend

```bash
cd client
npm install
npm run dev
```

Required frontend env values are documented in `client/.env.example`.

## Testing

The project includes unit, API integration, Redis, realtime, browser, and repeated Redis performance tests. Local services are isolated and resource-capped; heavy browser/performance matrices run in GitHub Actions.

See [TESTING.md](TESTING.md) for the strategy, commands, credentials, resource requirements, manual regressions, and release process. See [TEST_RESULTS.md](TEST_RESULTS.md) for every automated test case, the latest detailed results, coverage evidence, and steps to inspect or rerun the cases.

## Current Product Direction

The app is being pivoted from a generic social room platform into Connect.dev, a tech-first collaboration and developer help marketplace. The category system, copy, room creation flow, tickets, posted issues, profiles, discovery, matching, and future shared editor experience are being moved phase by phase into an engineering-focused product.
