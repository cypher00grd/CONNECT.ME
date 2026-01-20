import cron from 'node-cron';
import Room from '../models/Room.js';

export const startRoomCleanupJob = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find expired rooms
      const expiredRooms = await Room.find({
        status: 'active',
        autoDeleteAt: { $lte: now }
      });

      for (const room of expiredRooms) {
        room.status = 'ended';
        room.endedAt = now;
        await room.save();

        // Notify participants
        if (io) {
          io.to(room._id.toString()).emit('room_ended', {
            roomId: room._id,
            message: 'Room has been automatically closed'
          });
        }

        console.log(`🗑️ Room auto-deleted: ${room.title}`);
      }

      if (expiredRooms.length > 0) {
        console.log(`✅ Cleaned up ${expiredRooms.length} expired rooms`);
      }
    } catch (error) {
      console.error('Room cleanup error:', error);
    }
  });

  console.log('⏰ Room cleanup job started');
};