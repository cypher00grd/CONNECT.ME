import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri);

const col = mongoose.connection.collection('users');
const indexes = await col.indexes();

console.log('Current indexes on users collection:');
for (const idx of indexes) {
  console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);
  if (idx.key['techStack.languages'] && idx.key['techStack.frameworks']) {
    console.log('  ^ Dropping this broken compound index...');
    await col.dropIndex(idx.name);
    console.log('  ✅ Dropped!');
  }
}

await mongoose.disconnect();
console.log('Done');
