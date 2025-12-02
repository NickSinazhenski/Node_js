export type Attachment = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export type Article = {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  createdAt: string;
  updatedAt?: string;
  attachments: Attachment[];
  comments: import('./comment').Comment[];
};
