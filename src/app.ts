import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from '@routes';

const app = express();

// Middleware
app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

export default app;
