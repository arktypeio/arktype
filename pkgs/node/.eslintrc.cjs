const { getEslintConfig } = require("@re-/node")

module.exports = getEslintConfig({
    ignorePatterns: ["reflected.ts", "reflectedFromDir.ts", "*.js"],
    parserOptions: {
        project: ["tsconfig.json"]
    }
})
