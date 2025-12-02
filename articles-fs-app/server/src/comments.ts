import crypto from 'crypto';
import { CommentModel } from './models';
import type { Comment } from './types/comment';

export class CommentStore {
  constructor(private model = CommentModel) {}

  async listForArticle(articleId: string): Promise<Comment[]> {
    const rows = await this.model.findAll({
      where: { articleId },
      order: [['createdAt', 'ASC']],
    });
    return rows.map((row) => this.toComment(row));
  }

  async create(articleId: string, data: { author?: string | null; body: string }): Promise<Comment> {
    const id = crypto.randomUUID();
    const created = await this.model.create({
      id,
      articleId,
      author: data.author?.trim() || null,
      body: data.body,
    });
    return this.toComment(created);
  }

  async update(articleId: string, commentId: string, data: { author?: string | null; body: string }) {
    const record = await this.model.findOne({ where: { id: commentId, articleId } });
    if (!record) return null;
    const updated = await record.update({
      author: data.author?.trim() || null,
      body: data.body,
    });
    return this.toComment(updated);
  }

  async delete(articleId: string, commentId: string) {
    const deleted = await this.model.destroy({ where: { id: commentId, articleId } });
    return deleted > 0;
  }

  private toComment(record: CommentModel): Comment {
    return {
      id: record.id,
      articleId: record.articleId,
      author: record.author,
      body: record.body,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt?.toISOString() ?? record.createdAt.toISOString(),
    };
  }
}
