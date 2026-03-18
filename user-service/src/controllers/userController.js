
const UserModel = require("../models/userModel");

const userController = {
  getProfile: (req, res) => {
    const user = UserModel.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.status(200).json({ user: safeUser });
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name } = req.body;
      const updates = {};
      if (name) updates.name = name;
      const user = UserModel.update(req.user.userId, updates);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { passwordHash, ...safeUser } = user;
      res.status(200).json({ message: "Profile updated", user: safeUser });
    } catch (err) { next(err); }
  },

  getUserById: (req, res) => {
    // Used by other microservices (order/payment) to look up users
    const user = UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.status(200).json({ user: safeUser });
  },

  getAllUsers: (req, res) => {
    const users = UserModel.findAll().map(({ passwordHash, ...u }) => u);
    res.status(200).json({ users, count: users.length });
  },

  deleteUser: (req, res) => {
    const deleted = UserModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  }
};

module.exports = userController;
