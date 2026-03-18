const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.status === 500 || !err.status ? "Internal server error" : err.message });
};
module.exports = { errorHandler };
