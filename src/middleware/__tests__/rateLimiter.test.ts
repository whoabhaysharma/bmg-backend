import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiter Middleware', () => {
  it('should allow requests under the limit', async () => {
    const app = express();
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
    });
    app.use(limiter);
    app.get('/', (req, res) => res.status(200).send('OK'));

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  it('should block requests over the limit', async () => {
    const app = express();
    // Set a very low limit for testing
    const testLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 2, // Limit to 2 requests
      legacyHeaders: false,
      standardHeaders: true,
    });
    app.use(testLimiter);
    app.get('/', (req, res) => res.status(200).send('OK'));

    // Request 1: OK
    await request(app).get('/').expect(200);
    // Request 2: OK
    await request(app).get('/').expect(200);
    // Request 3: Blocked
    const res = await request(app).get('/');

    expect(res.status).toBe(429);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});
