import express, { type Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { router as healthRouter } from './routes';
import { errorHandler, requestLogger } from './middleware';

export const createApp = (routers: { path: string; router: Router }[] = []): express.Application => {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  app.use('/api', healthRouter);
  for (const { path, router } of routers) {
    app.use(path, router);
  }

  app.use(errorHandler);

  return app;
};
