import { useState, useEffect } from 'react';
import { CalendarX2 } from 'lucide-react';
import { roomAPI } from '../../services/api';
import ScheduledEventCard from './ScheduledEventCard';
import Loader from '../common/Loader';

const ScheduledEventsList = ({ userId, isOwnProfile }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchScheduledEvents = async () => {
            try {
                setIsLoading(true);
                const res = await roomAPI.getUserScheduledRooms(userId);
                if (res.data?.success) {
                    setEvents(res.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch scheduled events:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchScheduledEvents();
        }
    }, [userId]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader size="md" />
            </div>
        );
    }

    if (events.length === 0) {
        return null; // Don't show anything if there are no upcoming events
    }

    return (
        <div className="mb-8 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <CalendarX2 className="text-primary-500" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Live Events</h2>
            </div>

            <div className="grid gap-4">
                {events.map((event) => (
                    <ScheduledEventCard
                        key={event._id}
                        event={event}
                        isOwnProfile={isOwnProfile}
                    />
                ))}
            </div>
        </div>
    );
};

export default ScheduledEventsList;
