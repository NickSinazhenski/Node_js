import { WorkspaceModel } from './models';
import type { Workspace } from './types/workspace';
import { slugify } from './utils/slugify';

export class WorkspaceStore {
  constructor(private model = WorkspaceModel) {}

  async list(): Promise<Workspace[]> {
    const rows = await this.model.findAll({ order: [['createdAt', 'ASC']] });
    return rows.map((row) => this.toWorkspace(row));
  }

  async get(id: string): Promise<Workspace | null> {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    return this.toWorkspace(record);
  }

  async ensureDefault() {
    const exists = await this.model.findByPk('default');
    if (exists) return this.toWorkspace(exists);
    const created = await this.model.create({ id: 'default', name: 'Default Workspace' });
    return this.toWorkspace(created);
  }

  async create(input: { id?: string; name: string }): Promise<Workspace> {
    const candidateId = input.id?.trim() || slugify(input.name, 50) || 'workspace';
    const baseId = candidateId.slice(0, 50);
    let uniqueId = baseId;
    let suffix = 1;
    while (true) {
      const existing = await this.model.findByPk(uniqueId);
      if (!existing) break;
      uniqueId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const created = await this.model.create({ id: uniqueId, name: input.name.trim() });
    return this.toWorkspace(created);
  }

  private toWorkspace(record: WorkspaceModel): Workspace {
    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt?.toISOString() ?? record.createdAt.toISOString(),
    };
  }
}
