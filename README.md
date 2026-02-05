 CONNECT — Real-Time Rooms, interact , Calls & Community

CONNECT is a real-time social collaboration platform where users can create live rooms, invite followers, interact, launch multi-user WebRTC video calls, and even let rooms auto-delete when the session ends.
Perfect for  coding sessions, trip planning, study groups, team meetings, or chill hangouts — CONNECT makes real-time interaction fast, fluid, and beautifully simple.

 What Makes CONNECT Special :
 Create Live Rooms Instantly

Launch temporary real-time rooms in seconds.
Pick a category → invite your followers → Text or start a video call → room auto-cleans afterward.

 Follower-Based Community System

Your followers get instant notifications when you start a room.
They can join your live session or you can join theirs.
A natural way to build small communities.

 Ultra-Fast Real-Time Chat

Instant messaging with reactions, typing indicators, and message history (with pagination).
Feels like a lightweight Discord/Instagram Rooms hybrid.

 Seamless WebRTC Video Calls

Turn any room into a multi-person video session:
Toggle audio/video, stable peer connections, clean UI for local & remote streams.

 Live Notifications

Room invites, follows, video call invites, new messages — all pushed instantly.

 Auto-Deleting Rooms

Rooms can automatically disappear from the database when you're finished.
Perfect for temporary meetups, planning sessions, private discussions.

 Feature Breakdown
 Authentication Layer 

JWT authentication

Secure protected routes

Persistent session state (localStorage sync)

Automatic socket re-connection after login

Socket handshake authenticated using token

 Users Module (REST + WebSocket) 

Server-side user search

User profile fetching

Follow/Unfollow with optimized DB updates

Suggested users endpoint

Real-time follow notifications via Socket.IO

Profile sync across client state

 Rooms Module (Dynamic Real-Time Spaces)

Create, join, leave, end rooms

Optional auto-delete flag stored in DB

Track active participants

Broadcasted room lifecycle events

Global "Feed" + personalized "My Rooms"

Clean room state & participant management

 Messaging System

Real-time message delivery via Socket.IO

Reactions (emoji events)

Typing indicators

Pagination for older messages (API + params)

Deduplication & state consistency

 WebRTC Video Call Module

Local & remote media stream management

ICE candidates exchange through Socket.IO

Offer/Answer negotiation

Auto-manage peer connections

Join/leave without breaking the call

Audio/Video toggle

Multi-participant handling

Notifications Module

Persistent backend notifications

Real-time push via WebSocket

Video call invite storage

Unread counter

Mark-as-read endpoint

Notification → Redux → UI sync

 Installation & Setup
 Clone the Repository
git clone https://github.com/yourusername/connect.git
cd connect

 Backend Setup (/server)
cd server
npm install
npm start

Backend .env
MONGO_URI= YOUR_URI
JWT_SECRET= YOUR_JWT_SECRET
CLIENT_URL=http://localhost:5173

 Frontend Setup (/client)
cd client
npm install
npm run dev

Frontend .env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000

 Project Structure
CONNECT/
 ├── client/    
 └── server/    


🤝 Contributing

Pull requests and issues are welcome.
Improve UI, add new real-time features, optimize performance—everything helps.

Upcoming Features
1️⃣ SFU-Based Video Infrastructure (Scalable WebRTC Upgrade)

Currently, CONNECT uses pure peer-to-peer WebRTC.
Next upgrade brings SFU (Selective Forwarding Unit) support:

Media routing via central SFU server

Lower bandwidth usage (1 upstream → many downstream)

Better performance for 5–50 participants

Adaptive quality control

Automatic layer switching (Simulcast / SVC)

Eliminates P2P mesh limitations

This transforms CONNECT from small group calls into large, stable, low-latency live sessions.

2️⃣ Advanced Suggested Users Algorithm

We are enhancing the user recommendation engine using:

Graph-based proximity scoring (followers-of-followers)

Interest-based matching (room categories, behaviors)

Mutual connections weighting

This will make follower suggestions more accurate, personalized, and contextual
