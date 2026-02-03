import { Router } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { htmlToText } from 'html-to-text';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import type { ArticleStore } from '../articles';
import type { CommentStore } from '../comments';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { WorkspaceStore } from '../workspaces';
import type { Attachment } from '../types/article';
import type { NotificationMessage } from '../types/notifications';

const isAllowedMime = (mime: string) => mime.startsWith('image/') || mime === 'application/pdf';

const ArticleInput = z.object({
  workspaceId: z.string().trim().min(1, 'Workspace is required'),
  title: z.string().trim().min(3, 'Title is too short').max(120, 'Title too long'),
  content: z.string().trim().min(1, 'Content is required'),
});

const ArticleUpdateInput = ArticleInput.extend({
  workspaceId: ArticleInput.shape.workspaceId.optional(),
});

const CommentInput = z.object({
  author: z.string().trim().max(80, 'Author name too long').optional(),
  body: z.string().trim().min(1, 'Comment body is required'),
});

type Deps = {
  articles: ArticleStore;
  comments: CommentStore;
  workspaces: WorkspaceStore;
  attachmentsDir: string;
  broadcast: (message: NotificationMessage) => void;
};

export const createArticlesRouter = ({
  articles,
  comments,
  workspaces,
  attachmentsDir,
  broadcast,
}: Deps) => {
  const router = Router();

  const toPlainText = (html: string) =>
    htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: false } },
        { selector: 'img', format: 'skip' },
      ],
    }).trim();

  const canEditArticle = (article: { createdBy?: string | null }, user?: AuthenticatedRequest['user']) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!article.createdBy) return false;
    return article.createdBy === user.userId;
  };

  const ensureUploadDir = (articleId: string) => {
    const dir = path.join(attachmentsDir, articleId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };

  const removeAttachmentDir = async (articleId: string) => {
    const dir = path.join(attachmentsDir, articleId);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  const storage = multer.diskStorage({
    destination(req, _file, cb) {
      try {
        const dir = ensureUploadDir(req.params.id);
        cb(null, dir);
      } catch (err) {
        cb(err as Error, '');
      }
    },
    filename(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || '';
      cb(null, `${unique}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter(_req, file, cb) {
      if (!isAllowedMime(file.mimetype)) {
        return cb(new Error('Only 5MB files are allowed'));
      }
      cb(null, true);
    },
  });

  const attachmentUpload = upload.single('file');

  router.get('/', async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || 'default';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const workspace = await workspaces.get(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const list = await articles.list(workspaceId, search);
    res.json(list);
  });

  router.get('/:id', async (req, res) => {
    const versionParam = req.query.version as string | undefined;
    let version: number | undefined;
    if (versionParam !== undefined) {
      const parsedVersion = Number(versionParam);
      if (!Number.isFinite(parsedVersion) || parsedVersion < 1) {
        return res.status(400).json({ error: 'Invalid version number' });
      }
      version = parsedVersion;
    }

    const article = await articles.get(req.params.id, version);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  });

  router.get('/:id/versions', async (req, res) => {
    const versions = await articles.listVersions(req.params.id);
    if (!versions.length) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(versions);
  });

  router.get('/:id/export', async (req, res) => {
    const article = await articles.get(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const safeTitle = (article.title || 'article').replace(/[^\w\s-]/g, '').trim() || 'article';
    const fileName = `${safeTitle}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    doc.pipe(res);

    doc.fontSize(20).text(article.title || 'Untitled', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666');
    doc.text(`Workspace: ${article.workspaceId}`);
    doc.text(`Created: ${new Date(article.createdAt).toLocaleString()}`);
    if (article.updatedAt) {
      doc.text(`Updated: ${new Date(article.updatedAt).toLocaleString()}`);
    }
    if (article.createdBy) {
      doc.text(`Author: ${article.createdBy}`);
    }
    doc.fillColor('#000000');
    doc.moveDown();

    const contentText = toPlainText(article.content || '');
    doc.fontSize(12).text(contentText || '(No content)', { width: 480, align: 'left' });

    doc.end();
  });

  router.post('/', async (req: AuthenticatedRequest, res) => {
    const parsed = ArticleInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    try {
      const workspace = await workspaces.get(parsed.data.workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      const created = await articles.create({ ...parsed.data, createdBy: req.user!.userId });
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ error: 'Failed to save article' });
    }
  });

  router.put('/:id', async (req: AuthenticatedRequest, res) => {
    const parsed = ArticleUpdateInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    try {
      const existing = await articles.get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Article not found' });
      }
      if (!canEditArticle(existing, req.user)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (parsed.data.workspaceId) {
        const workspace = await workspaces.get(parsed.data.workspaceId);
        if (!workspace) {
          return res.status(404).json({ error: 'Workspace not found' });
        }
      }
      const updated = await articles.update(req.params.id, parsed.data);
      res.json(updated);
      if (updated) {
        broadcast({
          type: 'articleUpdated',
          articleId: updated.id,
          title: updated.title,
          timestamp: updated.updatedAt ?? new Date().toISOString(),
        });
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed to update article' });
    }
  });

  router.get('/:id/comments', async (req, res) => {
    const article = await articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article.comments ?? []);
  });

  router.post('/:id/comments', async (req, res) => {
    const parsed = CommentInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const article = await articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    try {
      const saved = await comments.create(article.id, parsed.data);
      res.status(201).json(saved);
    } catch (e) {
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  router.put('/:id/comments/:commentId', async (req, res) => {
    const parsed = CommentInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const article = await articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    try {
      const updated = await comments.update(article.id, req.params.commentId, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update comment' });
    }
  });

  router.delete('/:id/comments/:commentId', async (req, res) => {
    const article = await articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    try {
      const removed = await comments.delete(article.id, req.params.commentId);
      if (!removed) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  router.post('/:id/attachments', async (req: AuthenticatedRequest, res) => {
    const article = await articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    if (!canEditArticle(article, req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return attachmentUpload(req, res, async (err) => {
      if (err) {
        if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File is too large (max 5MB)' });
        }
        return res.status(400).json({ error: err.message || 'Failed to upload file' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const now = new Date().toISOString();
      const attachment: Attachment = {
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${article.id}/${file.filename}`,
        createdAt: now,
      };

      try {
        const saved = await articles.addAttachment(article.id, attachment);
        if (!saved) {
          await fsp.unlink(file.path).catch(() => {});
          return res.status(500).json({ error: 'Failed to save attachment' });
        }
        res.status(201).json(saved);
        broadcast({
          type: 'attachmentAdded',
          articleId: article.id,
          title: article.title,
          attachment: saved,
          timestamp: now,
        });
      } catch (error) {
        await fsp.unlink(file.path).catch(() => {});
        res.status(500).json({ error: 'Failed to save attachment' });
      }
    });
  });

  router.delete('/:id/attachments/:attachmentId', async (req: AuthenticatedRequest, res) => {
    const article = await articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    if (!canEditArticle(article, req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const removed = await articles.removeAttachment(article.id, req.params.attachmentId);
      if (!removed) {
        return res.status(404).json({ error: 'Attachment not found' });
      }
      const filePath = path.join(attachmentsDir, article.id, removed.fileName);
      await fsp.unlink(filePath).catch(() => {});
      res.status(204).end();
      broadcast({
        type: 'articleUpdated',
        articleId: article.id,
        title: article.title,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete attachment' });
    }
  });

  router.delete('/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const existing = await articles.get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Article not found' });
      }
      if (!canEditArticle(existing, req.user)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await articles.delete(req.params.id);
      await removeAttachmentDir(req.params.id);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete article' });
    }
  });

  return router;
};
