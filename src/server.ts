import { config } from 'dotenv';
import app from './app';
import { initializeAdmin } from './lib/initializeAdmin';
import './workers/paymentWorker'; // Initialize worker

config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initializeAdmin();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
