import express from 'express';
import { router } from './routes';
import { errorHandler, requestLogger } from './middleware';

export const createApp = (): express.Application => {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);
  app.use('/api', router);
  app.use(errorHandler);

  return app;
};
