const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const users = new Map();

const UserModel = {
  async create({ name, email, password, role = 'customer' }) {
    const existing = [...users.values()].find(u => u.email === email);
    if (existing) throw new Error('Email already registered');
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(), name, email,
      password: hashedPassword, role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.set(user.id, user);
    return UserModel.sanitize(user);
  },
  async findByEmail(email) {
    return [...users.values()].find(u => u.email === email) || null;
  },
  async findById(id) {
    return users.get(id) || null;
  },
  async findAll() {
    return [...users.values()].map(UserModel.sanitize);
  },
  async update(id, updates) {
    const user = users.get(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    users.set(id, updated);
    return UserModel.sanitize(updated);
  },
  async delete(id) {
    return users.delete(id);
  },
  sanitize(user) {
    const { password, ...safe } = user;
    return safe;
  },
  async verifyPassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
  }
};

module.exports = UserModel;
