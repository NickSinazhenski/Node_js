import type { Attachment } from './article';

export type NotificationMessage =
  | { type: 'articleUpdated'; articleId: string; title: string; timestamp: string }
  | { type: 'attachmentAdded'; articleId: string; title: string; attachment: Attachment; timestamp: string };
