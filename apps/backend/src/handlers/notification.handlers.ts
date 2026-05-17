import type { RequestHandler } from 'express';
import type { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';

export type NotificationHandlers = {
  list: RequestHandler;
  markRead: RequestHandler;
};

export const makeNotificationHandlers = (service: NotificationService): NotificationHandlers => ({
  list: asyncHandler(async (req, res) => {
    const notifications = await service.listForUser(req.user.sub);
    res.json(notifications);
  }),

  markRead: asyncHandler(async (req, res) => {
    await service.markRead(req.params.id, req.user.sub);
    res.status(204).send();
  }),
});
