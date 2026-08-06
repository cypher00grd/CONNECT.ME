import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { loadTestEnvironment } from './load-test-env.mjs';
import { assertSafeTestEnvironment } from './test-db-guard.mjs';
import User from '../models/User.js';
import Room from '../models/Room.js';
import IssuePost from '../models/IssuePost.js';
import Ticket from '../models/Ticket.js';

loadTestEnvironment();
const target = assertSafeTestEnvironment();
const profileArg = process.argv.find((argument) => argument.startsWith('--profile='));
const profile = profileArg?.split('=')[1] || 'functional';
const performance = profile === 'performance';
const counts = performance
  ? { users: 1000, rooms: 2000, issues: 2000, tickets: 500 }
  : { users: 12, rooms: 30, issues: 30, tickets: 20 };

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  const password = await bcrypt.hash('ConnectTestOnly!1', 4);
  const users = Array.from({ length: counts.users }, (_, index) => ({
    username: `testuser${String(index).padStart(4, '0')}`,
    email: `testuser${index}@example.test`,
    password,
    displayName: `Test User ${index}`,
    skills: index % 2 === 0 ? ['javascript', 'react'] : ['python', 'django'],
    techStack: index % 2 === 0
      ? { languages: ['javascript'], frameworks: ['react'], tools: ['redis'] }
      : { languages: ['python'], frameworks: ['django'], tools: ['mongodb'] },
    specialization: index % 2 === 0 ? 'frontend' : 'backend',
    experienceLevel: ['junior', 'mid', 'senior'][index % 3],
    isInstructor: index % 3 === 0,
    openToMentor: index % 3 === 0,
    isOnline: index % 2 === 0
  }));
  const insertedUsers = await User.collection.insertMany(users);
  const userIds = Object.values(insertedUsers.insertedIds);

  const rooms = Array.from({ length: counts.rooms }, (_, index) => ({
    title: `Seed room ${index}`,
    description: 'Deterministic room used by the Connect.dev test suite.',
    category: index % 2 === 0 ? 'frontend' : 'backend',
    techTags: index % 2 === 0 ? ['javascript', 'react'] : ['python', 'django'],
    creator: userIds[index % userIds.length],
    participants: [{ user: userIds[index % userIds.length], joinedAt: new Date() }],
    status: 'active',
    type: 'standard',
    createdAt: new Date(Date.now() - index * 1000),
    updatedAt: new Date()
  }));
  await Room.collection.insertMany(rooms);

  const issues = Array.from({ length: counts.issues }, (_, index) => ({
    poster: userIds[index % userIds.length],
    title: `Seed issue ${index}`,
    details: 'Deterministic issue details for integration and performance testing.',
    tags: index % 2 === 0 ? ['javascript'] : ['python'],
    techStack: index % 2 === 0 ? ['react'] : ['django'],
    status: 'open',
    paymentStatus: 'not_required',
    bountyAmount: 0,
    createdAt: new Date(Date.now() - index * 1000),
    updatedAt: new Date()
  }));
  await IssuePost.collection.insertMany(issues);

  const tickets = Array.from({ length: counts.tickets }, (_, index) => ({
    requester: userIds[index % userIds.length],
    title: `Seed ticket ${index}`,
    description: 'Deterministic help ticket for matching and visibility tests.',
    tags: index % 2 === 0 ? ['javascript'] : ['python'],
    techStack: index % 2 === 0 ? ['react'] : ['django'],
    status: 'searching',
    visibility: 'public',
    paymentStatus: 'not_required',
    bountyAmount: 0,
    createdAt: new Date(Date.now() - index * 1000),
    updatedAt: new Date()
  }));
  await Ticket.collection.insertMany(tickets);

  console.log(`Seeded ${profile} data in ${target.database}: ${JSON.stringify(counts)}`);
} finally {
  await mongoose.disconnect();
}
