const { getEslintConfig } = require("@re-/node")

module.exports = getEslintConfig({
    ignorePatterns: ["generateSpace.ts"],
    parserOptions: {
        project: ["./src/tsconfig.json", "./tests/tsconfig.json"]
    }
})
