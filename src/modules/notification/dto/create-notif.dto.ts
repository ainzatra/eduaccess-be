import { NotificationType } from '@prisma/client';

export class createNotification {
    title: string;
    description?: string;
    subject_id: string;
    activity_id: string;
    user_id: string;
    type: NotificationType;
}
