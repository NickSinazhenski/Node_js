import { promises as fs } from 'fs';
import path from 'path';

export type Article = {
  id: string;       
  title: string;
  content: string;  
  createdAt: string; 
};

const ensureDir = async (dir: string) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e: any) {
    if (e.code !== 'EEXIST') throw e;
  }
};

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

export class ArticleStore {
  constructor(private dataDir: string) {}

  private fileFor(id: string) {
    return path.join(this.dataDir, `${id}.json`);
  }

  async init() {
    await ensureDir(this.dataDir);
  }

  async list(): Promise<Pick<Article, 'id' | 'title' | 'createdAt'>[]> {
    await this.init();
    const files = await fs.readdir(this.dataDir);
    const items: Pick<Article, 'id' | 'title' | 'createdAt'>[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(this.dataDir, f), 'utf8');
        const a = JSON.parse(raw) as Article;
        items.push({ id: a.id, title: a.title, createdAt: a.createdAt });
      } catch {}
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }

  async get(id: string): Promise<Article | null> {
    try {
      const raw = await fs.readFile(this.fileFor(id), 'utf8');
      return JSON.parse(raw) as Article;
    } catch {
      return null;
    }
  }

  async create(input: { title: string; content: string }): Promise<Article> {
    await this.init();
    const stamp = new Date();
    const id = `${slugify(input.title) || 'article'}-${
      stamp
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14) 
    }`;
    const article: Article = {
      id,
      title: input.title.trim(),
      content: input.content,
      createdAt: stamp.toISOString(),
    };
    await fs.writeFile(this.fileFor(id), JSON.stringify(article, null, 2), 'utf8');
    return article;
  }

  async update(id: string, data: { title: string; content: string }) {
    const article = await this.get(id);
    if (!article) return null;

    const updated = { ...article, ...data, updatedAt: new Date().toISOString() };
    await fs.writeFile(this.fileFor(id), JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  async delete(id: string) {
    const article = await this.get(id);
    if (!article) return false;

    await fs.unlink(this.fileFor(id));
    return true;
  }
}