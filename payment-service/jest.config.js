module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js"],
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ["./tests/setup.js"]
};
