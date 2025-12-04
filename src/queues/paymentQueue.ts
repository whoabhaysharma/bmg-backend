import { Queue } from 'bullmq';
import { connection } from '../config/queue';

export const PAYMENT_QUEUE_NAME = 'payment-events';

export const paymentQueue = new Queue(PAYMENT_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export const addPaymentEventToQueue = async (event: any) => {
    await paymentQueue.add('payment_event', event);
};
