const { getEslintConfig } = require("@re-/node")

module.exports = getEslintConfig({
    ignorePatterns: ["reflected.ts", "reflectedFromDir.ts"],
    parserOptions: {
        project: ["tsconfig.json"]
    }
})
