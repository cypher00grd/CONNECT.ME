import cron from 'node-cron';
import Room from '../models/Room.js';

/**
 * Runs every minute:
 * - Ends rooms whose autoDeleteAt <= now
 * - Cleans up socket rooms (chat + video)
 * - Notifies participants
 */
export const startRoomCleanupJob = (io) => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find rooms that should be auto-ended
      const expiredRooms = await Room.find({
        status: 'active',
        autoDeleteAt: { $ne: null, $lte: now }
      });

      for (const room of expiredRooms) {
        room.status = 'ended';
        room.endedAt = now;
        await room.save();

        const roomId = room._id.toString();
        const videoRoomId = `${roomId}-video`;

        // 🔔 Notify CHAT users
        io.to(roomId).emit('room_ended', {
          roomId,
          reason: 'auto',
          message: 'Room has been closed'
        });

        // 🔔 Notify VIDEO users
        io.to(videoRoomId).emit('room_ended', {
          roomId,
          reason: 'auto',
          message: 'Video call ended  room was closed'
        });

        // 🧹 Force users to leave socket rooms
        io.in(roomId).socketsLeave(roomId);
        io.in(videoRoomId).socketsLeave(videoRoomId);

        console.log(`🗑️ Auto-closed room: ${room.title}`);
      }

      if (expiredRooms.length > 0) {
        console.log(`✅ Cleaned ${expiredRooms.length} expired rooms`);
      }
    } catch (error) {
      console.error('❌ Room cleanup error:', error);
    }
  });

  console.log('⏰ Room cleanup cron job started');
};
