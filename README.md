CONNECT — Real-Time Rooms, Interaction, Calls & Community

CONNECT is a real-time social collaboration platform where users can create live rooms, invite followers, chat instantly, launch multi-user WebRTC calls, and even set rooms to auto-delete once the session ends.

Perfect for coding sessions, guitar jams, trip planning, study groups, team meetings, or casual hangouts — CONNECT makes real-time interaction fast, fluid, and beautifully simple.

🚀 What Makes CONNECT Special
🏠 Create Live Rooms Instantly

Launch lightweight, temporary rooms in seconds.
Pick a category → invite followers → chat or start a video call → let it auto-clean afterward.

👥 Follower-Based Micro Communities

Followers get instant notifications when you start a room.
Join each other’s live spaces effortlessly.

⚡ Ultra-Fast Real-Time Chat

Instant messages

Emoji reactions

Typing indicators

Message history (with pagination)
Feels like a blend of Discord channels + Instagram live rooms.

🎥 Seamless WebRTC Video Calls

Turn any room into a multi-person video hangout:

Join/leave anytime

Toggle audio/video

Stable multi-peer WebRTC connection

Clean UI for local + remote streams

🔔 Live Notifications

Room invites, follows, call invites, and new messages — all pushed instantly.

🧹 Auto-Deleting Rooms

Enable auto-delete to remove rooms from the database once you’re done.
Perfect for temporary or private meetups.

🛠️ Feature Breakdown
🔐 Authentication Layer

JWT-based authentication

Protected API routes

Persistent session (localStorage sync)

Auto socket reconnect after login

Secure token-based socket handshake

👤 Users Module (REST + WebSocket)

User search (server-side)

Profile fetching

Follow/Unfollow with efficient DB updates

Suggested users endpoint

Real-time follow notifications

Profile state syncing in Redux

📡 Rooms Module (Dynamic Real-Time Spaces)

Create, join, leave, end rooms

Optional auto-delete flag

Track active participants

Global room feed + “My Rooms”

Full room lifecycle broadcasting

Clean room + participant state management

💬 Messaging System

Real-time messages via Socket.IO

Emoji reactions

Typing indicators

Paginated message loading

Deduplication & state consistency

🎥 WebRTC Video Calls

Local & remote media stream management

Offer/Answer negotiation via WebSockets

ICE candidate exchange

Auto-manage multiple peer connections

Join/Leave without breaking the entire call

Audio/Video toggles

Works seamlessly with room flow

🔔 Notifications Module

Persistent backend notifications

Real-time push via Socket.IO

Video call invite tracking

Unread counter

Mark-as-read endpoint

Clean sync with Redux & UI

📦 Installation & Setup
📁 Clone the Repository
git clone https://github.com/yourusername/connect.git
cd connect

🖥️ Backend Setup (/server)
cd server
npm install
npm start

Backend .env
MONGO_URI=YOUR_URI
JWT_SECRET=YOUR_JWT_SECRET
CLIENT_URL=http://localhost:5173

💻 Frontend Setup (/client)
cd client
npm install
npm run dev

Frontend .env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000

📂 Project Structure
CONNECT/
 ├── client/    
 └── server/

🤝 Contributing

Pull requests and issues are welcome!
Help improve UI, add new real-time features, or optimize performance.

🔮 Upcoming Features
1️⃣ SFU-Based Video Infrastructure (Scalable WebRTC Upgrade)

CONNECT currently uses P2P WebRTC mesh.
Next upgrade introduces an SFU (Selective Forwarding Unit):

Route media via central server

1 upstream → many downstream

Supports 5–50+ participants

Adaptive quality control

Simulcast/SVC support

Removes heavy peer mesh limits

Benefit:
Transforms CONNECT into a large-group, low-latency live communication platform.

2️⃣ Advanced Suggested Users Algorithm

A smarter, graph-driven recommendation engine:

Followers-of-followers scoring

Interest-based matching (room categories, behavior)

Mutual connection weighting

Benefit:
More accurate, contextual, and engaging user discovery.
