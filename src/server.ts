import app from './app';
import { initializeAdmin } from './lib/initializeAdmin';
import './workers/paymentWorker'; // Initialize worker
import { initAuditWorker } from './workers/audit.worker';
import { config } from './config/config';

const PORT = config.port;

const startServer = async () => {
  try {
    await initializeAdmin();
    initAuditWorker();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
