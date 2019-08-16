const { join } = require("path")

module.exports = {
    clearMocks: true,
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "json"],
    testRegex: "/__tests__/.*\\.test\\.(j|t)sx?$",
    roots: ["<rootDir>/src"],
    setupFiles: [join(__dirname, "jest.setup.js")],
    transform: {
        "^.+\\.ts$": "ts-jest"
    },
    globals: {
        "ts-jest": {
            tsConfig: "<rootDir>/tsconfig.test.json",
            packageJson: "<rootDir>/package.json"
        }
    }
}
