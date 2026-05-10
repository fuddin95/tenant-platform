import type { PrismaClient } from '@rental-trust/database';
import type { INotificationRepository, CreateNotificationData } from '../interfaces/INotificationRepository';

export const makeNotificationRepository = (db: PrismaClient): INotificationRepository => ({
  findByRecipient: (recipientId) =>
    db.notification.findMany({ where: { recipientId }, orderBy: { createdAt: 'desc' } }),

  create: (data: CreateNotificationData) => db.notification.create({ data }),

  markRead: async (id): Promise<void> => {
    await db.notification.update({ where: { id }, data: { read: true } });
  },
});
