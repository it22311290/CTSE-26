const User = require("../models/userModel");

const userController = {
  getProfile: async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.status(200).json({ user });
    } catch (err) { next(err); }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name } = req.body;
      const updates = {};
      if (name) updates.name = name;
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      res.status(200).json({ message: "Profile updated", user });
    } catch (err) { next(err); }
  },

  getUserById: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.status(200).json({ user });
    } catch (err) { next(err); }
  },

  getAllUsers: async (req, res, next) => {
    try {
      const users = await User.find();
      res.status(200).json({ users, count: users.length });
    } catch (err) { next(err); }
  },

  deleteUser: async (req, res, next) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.status(200).json({ message: "User deleted successfully" });
    } catch (err) { next(err); }
  }
};

module.exports = userController;
