import { useState } from 'react';
import { CalendarDays, Clock, IndianRupee, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import { bookingAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const ScheduledEventCard = ({ event, isOwnProfile, onBookingSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isBooked, setIsBooked] = useState(event.isBooked);

    // Parse time
    const scheduledTime = new Date(event.scheduledStartTime);

    const handlePayment = async () => {
        try {
            setIsProcessing(true);

            // 1. Create Checkout Session Backend
            const res = await bookingAPI.createCheckoutSession({ roomId: event._id });

            if (!res.data.success) {
                toast.error(res.data.message || 'Failed to initialize checkout');
                setIsProcessing(false);
                return;
            }

            // 2. Redirect to Stripe Hosted Checkout
            if (res.data.url) {
                window.location.href = res.data.url;
            } else {
                toast.error('Did not receive a checkout URL from the server');
            }

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Payment integration error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="card p-5 border border-primary-500/20 bg-gradient-to-br from-white to-primary-50/50 dark:from-dark-800 dark:to-primary-900/10">
            <div className="flex flex-col sm:flex-row justify-between gap-4">

                {/* Event Details */}
                <div className="space-y-3 flex-1">
                    <div>
                        <span className="inline-block px-2.5 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full mb-2">
                            Scheduled Event
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {event.title}
                        </h3>
                        {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                                {event.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <CalendarDays size={16} className="text-primary-500" />
                            <span>{formatDate(event.scheduledStartTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-primary-500" />
                            <span>
                                {scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Panel */}
                <div className="flex flex-col sm:items-end justify-center min-w-[140px] border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-dark-700 pt-4 sm:pt-0 sm:pl-4">
                    <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center mb-3">
                        <IndianRupee size={20} className="mr-0.5" />
                        {event.entryFee}
                    </div>

                    {isOwnProfile ? (
                        <span className="text-sm font-medium text-primary-500">Your Event</span>
                    ) : isBooked ? (
                        <Button variant="outline" className="opacity-100 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" disabled fullWidth>
                            <CheckCircle2 size={16} className="mr-2" /> Booked
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handlePayment}
                            isLoading={isProcessing}
                        >
                            Book Spot
                        </Button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ScheduledEventCard;
