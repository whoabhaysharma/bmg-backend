import { Worker } from 'bullmq';
import { redisConnectionConfig } from '../lib/redis';
import { PAYMENT_QUEUE_NAME } from '../queues/paymentQueue';
import { subscriptionService } from '../services/subscription.service';
import IORedis from 'ioredis';

const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const paymentWorker = new Worker(
    PAYMENT_QUEUE_NAME,
    async (job) => {
        console.log(`Processing payment job ${job.id}`);
        const event = job.data;

        try {
            if (event.event === 'payment.captured') {
                const paymentEntity = event.payload.payment.entity;
                const orderId = paymentEntity.order_id;
                const paymentId = paymentEntity.id;
                const notes = paymentEntity.notes;
                const subscriptionId = notes?.subscriptionId;

                console.log('Worker processing payment:', { orderId, paymentId, subscriptionId });

                // We use a placeholder signature since verification happened at ingress
                await subscriptionService.handlePaymentSuccess(
                    orderId,
                    paymentId,
                    'WEBHOOK_VERIFIED',
                    subscriptionId
                );

                console.log(`Payment job ${job.id} completed successfully`);
            } else {
                console.log(`Ignoring event type: ${event.event}`);
            }
        } catch (error) {
            console.error(`Payment job ${job.id} failed:`, error);
            throw error;
        }
    },
    {
        connection,
        concurrency: 5, // Process 5 jobs in parallel
    }
);

paymentWorker.on('completed', (job) => {
    if (job) {
        console.log(`Job ${job.id} completed!`);
    }
});

paymentWorker.on('failed', (job, err) => {
    if (job) {
        console.error(`Job ${job.id} failed with ${err.message}`);
    }
});
