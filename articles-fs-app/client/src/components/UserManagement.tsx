import { useEffect, useState } from 'react';
import { listUsers, updateUserRole } from '../api';
import { useAuth } from '../auth-context';
import type { UserRole, UserSummary } from '../types';

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message ?? 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (targetId: string, nextRole: UserRole) => {
    if (!targetId) return;
    setError(null);
    setSaving((prev) => ({ ...prev, [targetId]: true }));
    try {
      const updated = await updateUserRole(targetId, nextRole);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      setError(e.message ?? 'Failed to update role');
    } finally {
      setSaving((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    }
  };

  if (loading) return <p>Loading users…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section className="user-management">
      <div className="user-management-header">
        <div>
          <h2>User Management</h2>
          <p className="meta">Admins can update roles for other users.</p>
        </div>
      </div>

      {!users.length && <p>No users found.</p>}

      {!!users.length && (
        <ul className="list">
          {users.map((u) => {
            const isSelf = user?.id === u.id;
            const isSaving = Boolean(saving[u.id]);
            return (
              <li key={u.id} className="list-item">
                <div>
                  <div className="title">{u.email}</div>
                  <div className="meta">{isSelf ? 'You' : u.id}</div>
                </div>
                <div className="user-role-control">
                  <select
                    className="role-select"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    disabled={isSelf || isSaving}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <span className="meta">{isSelf ? 'Cannot edit own role' : isSaving ? 'Saving…' : ''}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
