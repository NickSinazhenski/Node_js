import { ArticleModel, type ArticleInstance } from './models/article';
import type { Article, Attachment } from './types/article';
export type { Article, Attachment } from './types/article';

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

export class ArticleStore {
  constructor(private model = ArticleModel) {}

  async list(): Promise<Pick<Article, 'id' | 'title' | 'createdAt'>[]> {
    const rows = await this.model.findAll({
      attributes: ['id', 'title', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async get(id: string): Promise<Article | null> {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    return this.toArticle(record);
  }

  async create(input: { title: string; content: string }): Promise<Article> {
    const stamp = new Date();
    const id = `${slugify(input.title) || 'article'}-${
      stamp
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14) 
    }`;

    const created = await this.model.create({
      id,
      title: input.title.trim(),
      content: input.content,
      attachments: [],
    });

    return this.toArticle(created);
  }

  async update(id: string, data: { title: string; content: string }) {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    const updated = await record.update({ title: data.title.trim(), content: data.content });
    return this.toArticle(updated);
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

  private toArticle(record: ArticleInstance): Article {
    return {
      id: record.id,
      title: record.title,
      content: record.content,
      attachments: record.attachments ?? [],
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}
