import bcrypt from 'bcryptjs';
import { UserModel } from './models';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type UserRole = 'admin' | 'user';

export type UserSummary = {
  id: string;
  email: string;
  role: UserRole;
};

export class UserStore {
  constructor(private model = UserModel) {}

  async findByEmail(email: string): Promise<AuthUser & { passwordHash: string } | null> {
    const record = await this.model.findOne({ where: { email } });
    if (!record) return null;
    return { id: record.id, email: record.email, role: record.role ?? 'user', passwordHash: record.passwordHash };
  }

  async create(email: string, password: string): Promise<AuthUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const adminCount = await this.model.count({ where: { role: 'admin' } });
    const role: UserRole = adminCount === 0 ? 'admin' : 'user';
    const created = await this.model.create({ email, passwordHash, role });
    return { id: created.id, email: created.email, role: created.role ?? 'user' };
  }

  async verify(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  async list(): Promise<UserSummary[]> {
    const rows = await this.model.findAll({ attributes: ['id', 'email', 'role'], order: [['createdAt', 'ASC']] });
    return rows.map((row) => ({ id: row.id, email: row.email, role: row.role ?? 'user' }));
  }

  async updateRole(id: string, role: UserRole): Promise<UserSummary | null> {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    const updated = await record.update({ role });
    return { id: updated.id, email: updated.email, role: updated.role ?? 'user' };
  }
}
