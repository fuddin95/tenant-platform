import type { Notification, NotificationType, ActorType } from '@rental-trust/database';

export type CreateNotificationData = {
  applicationId: string;
  recipientId: string;
  recipientType: ActorType;
  type: NotificationType;
};

export interface INotificationRepository {
  findByRecipient(recipientId: string): Promise<Notification[]>;
  create(data: CreateNotificationData): Promise<Notification>;
  markRead(id: string): Promise<void>;
}
