import { sequelize } from './db';
import { ArticleModel, ArticleVersionModel, CommentModel, type ArticleInstance } from './models';
import type { Article, Attachment } from './types/article';
import type { Comment } from './types/comment';
import { slugify } from './utils/slugify';
export type { Article, Attachment } from './types/article';

export class ArticleStore {
  constructor(private model = ArticleModel) {}

  async list(
    workspaceId: string,
  ): Promise<Array<Pick<Article, 'id' | 'title' | 'createdAt' | 'workspaceId' | 'createdBy'> & { version: number }>> {
    const rows = await this.model.findAll({
      attributes: ['id', 'title', 'createdAt', 'workspaceId', 'currentVersion', 'createdBy'],
      where: { workspaceId },
      order: [['createdAt', 'DESC']],
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      workspaceId: row.workspaceId,
      createdBy: row.createdBy ?? null,
      version: Number(row.currentVersion ?? 1),
    }));
  }

  async get(id: string, version?: number): Promise<Article | null> {
    const record = await this.model.findByPk(id, {
      include: [
        {
          model: CommentModel,
          as: 'comments',
          separate: true,
          order: [['createdAt', 'ASC']],
        },
      ],
    });
    if (!record) return null;

    const latestVersion = record.currentVersion ?? 1;
    const targetVersion = version ?? latestVersion;
    const versionRecord = await ArticleVersionModel.findOne({ where: { articleId: id, version: targetVersion } });
    if (!versionRecord) return null;

    return this.toArticle(record, versionRecord, latestVersion);
  }

  async create(input: { title: string; content: string; workspaceId: string; createdBy: string }): Promise<Article> {
    const stamp = new Date();
    const id = `${slugify(input.title) || 'article'}-${
      stamp
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14)
    }`;

    return sequelize.transaction(async (transaction) => {
      const created = await this.model.create(
        {
          id,
          title: input.title.trim(),
          content: input.content,
          workspaceId: input.workspaceId,
          attachments: [],
          createdBy: input.createdBy,
          currentVersion: 1,
        },
        { transaction },
      );

      const versionRecord = await ArticleVersionModel.create(
        {
          articleId: id,
          version: 1,
          title: created.title,
          content: created.content,
          workspaceId: created.workspaceId,
        },
        { transaction },
      );

      return this.toArticle(created, versionRecord, 1);
    });
  }

  async update(id: string, data: { title: string; content: string; workspaceId?: string }) {
    return sequelize.transaction(async (transaction) => {
      const record = await this.model.findByPk(id, { transaction });
      if (!record) return null;

      const nextVersion = (record.currentVersion ?? 0) + 1;
      const updated = await record.update(
        {
          title: data.title.trim(),
          content: data.content,
          workspaceId: data.workspaceId ?? record.workspaceId,
          currentVersion: nextVersion,
        },
        { transaction },
      );

      const versionRecord = await ArticleVersionModel.create(
        {
          articleId: updated.id,
          version: nextVersion,
          title: updated.title,
          content: updated.content,
          workspaceId: updated.workspaceId,
        },
        { transaction },
      );

      return this.toArticle(updated, versionRecord, nextVersion);
    });
  }

  async addAttachment(id: string, attachment: Attachment) {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    const attachments = [...(record.attachments ?? []), attachment];
    await record.update({ attachments });
    return attachment;
  }

  async removeAttachment(id: string, attachmentId: string) {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    const attachments = record.attachments ?? [];
    const target = attachments.find((att) => att.id === attachmentId);
    if (!target) return null;
    const filtered = attachments.filter((att) => att.id !== attachmentId);
    await record.update({ attachments: filtered });
    return target;
  }

  async delete(id: string) {
    const deleted = await this.model.destroy({ where: { id } });
    return deleted > 0;
  }

  async getCreator(id: string): Promise<{ createdBy: string | null } | null> {
    const record = await this.model.findByPk(id, { attributes: ['id', 'createdBy'] });
    if (!record) return null;
    return { createdBy: record.createdBy ?? null };
  }

  async listVersions(articleId: string): Promise<
    { version: number; title: string; createdAt: string; workspaceId: string }[]
  > {
    const rows = await ArticleVersionModel.findAll({
      attributes: ['version', 'title', 'workspaceId', 'createdAt'],
      where: { articleId },
      order: [['version', 'DESC']],
    });

    return rows.map((row) => ({
      version: row.version,
      title: row.title,
      workspaceId: row.workspaceId,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private toArticle(
    record: ArticleInstance & { comments?: CommentModel[] },
    versionRecord: ArticleVersionModel,
    latestVersion: number,
  ): Article {
    return {
      id: record.id,
      title: versionRecord.title,
      content: versionRecord.content,
      attachments: record.attachments ?? [],
      workspaceId: versionRecord.workspaceId ?? record.workspaceId,
      createdBy: record.createdBy ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: versionRecord.createdAt.toISOString(),
      comments: record.comments?.map((c) => this.toComment(c)) ?? [],
      version: versionRecord.version,
      latestVersion,
      isLatest: versionRecord.version === latestVersion,
    };
  }

  private toComment(comment: CommentModel): Comment {
    return {
      id: comment.id,
      articleId: comment.articleId,
      author: comment.author,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt?.toISOString() ?? comment.createdAt.toISOString(),
    };
  }
}
