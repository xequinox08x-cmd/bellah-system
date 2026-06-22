import type Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const DEFAULT_USERS = [
  {
    name: 'Administrator',
    email: 'admin@bellah.com',
    password: 'admin123',
    role: 'admin' as const,
    username: 'admin',
    bio: 'System administrator',
  },
];

export function seedUsersIfEmpty(database: Database.Database): void {
  const count = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count.count > 0) return;

  const insert = database.prepare(`
    INSERT INTO users (name, email, password_hash, role, username, bio, status, created_at, updated_at)
    VALUES (@name, @email, @password_hash, @role, @username, @bio, 'active', datetime('now'), datetime('now'))
  `);

  const seedMany = database.transaction(() => {
    for (const user of DEFAULT_USERS) {
      const password_hash = bcrypt.hashSync(user.password, 10);
      insert.run({
        name: user.name,
        email: user.email,
        password_hash,
        role: user.role,
        username: user.username,
        bio: user.bio,
      });
    }
  });

  seedMany();

  console.info('[seed] default admin created (admin@bellah.com)');
  console.info('[seed] change default passwords after first login');
}
