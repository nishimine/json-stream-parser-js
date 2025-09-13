module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js', '**/test/**/*.spec.js'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/test/test.js', // メインランナーは除外
    ],
    collectCoverageFrom: ['src/**/*.js', '!src/**/*.d.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 1000,
    maxWorkers: 1,
    verbose: true,
};
