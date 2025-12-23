import bcrypt from 'bcryptjs';
import { UserModel } from './models';

export type AuthUser = {
  id: string;
  email: string;
};

export class UserStore {
  constructor(private model = UserModel) {}

  async findByEmail(email: string): Promise<AuthUser & { passwordHash: string } | null> {
    const record = await this.model.findOne({ where: { email } });
    if (!record) return null;
    return { id: record.id, email: record.email, passwordHash: record.passwordHash };
  }

  async create(email: string, password: string): Promise<AuthUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.model.create({ email, passwordHash });
    return { id: created.id, email: created.email };
  }

  async verify(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, email: user.email };
  }
}
