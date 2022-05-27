const { defineConfig } = require("eslint-define-config")

module.exports = defineConfig({
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "prefer-arrow", "import", "unicorn"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:import/typescript",
        "plugin:unicorn/recommended",
        "prettier"
    ],
    settings: {
        "import/resolver": {
            typescript: {
                project: ["@re-/*/tsconfig.json"]
            }
        }
    },
    parserOptions: {
        project: ["tsconfig.json", "@re-/*/tsconfig.json"]
    },
    ignorePatterns: ["**/dist/**", "**/*js"],
    rules: {
        /**
         * General restrictions
         */
        curly: "error",
        eqeqeq: "error",
        "no-param-reassign": "error",
        "@typescript-eslint/default-param-last": "error",
        /**
         * Conventions
         */
        "@typescript-eslint/consistent-type-assertions": [
            "error",
            { assertionStyle: "as" }
        ],
        "@typescript-eslint/naming-convention": [
            "error",
            { selector: "objectLiteralProperty", format: null },
            {
                selector: "variable",
                modifiers: ["destructured"],
                format: null
            }
        ],
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/prefer-optional-chain": "error",
        "import/no-default-export": "error",

        /**
         * Require the use of arrow functions where possible
         */
        "func-style": ["error", "expression"],
        "prefer-arrow/prefer-arrow-functions": [
            "error",
            {
                disallowPrototype: true,
                singleReturnOnly: false,
                classPropertiesAllowed: false
            }
        ],
        "prefer-arrow-callback": ["error", { allowNamedFunctions: true }],
        /**
         * Organize imports
         */
        "@typescript-eslint/no-duplicate-imports": "error",
        // Sort import statements
        "import/order": [
            "error",
            {
                alphabetize: {
                    order: "asc"
                }
            }
        ],
        // Sort destructured variables within a single import statement
        "sort-imports": [
            "error",
            {
                ignoreCase: true,
                ignoreDeclarationSort: true
            }
        ],
        /**
         * Allow more flexible typing
         */
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        /**
         * Disable or adjust unicorn/recommended rules that don't fit our code style
         */
        "unicorn/explicit-length-check": "off",
        "unicorn/no-useless-undefined": "off",
        "unicorn/filename-case": ["error", { case: "camelCase" }],
        "unicorn/prefer-switch": "off",
        "unicorn/prevent-abbreviations": "off",
        "unicorn/no-array-callback-reference": "off",
        "unicorn/no-process-exit": "off",
        /**
         * Temporarily disabled settings we may enable in the future
         */
        "@typescript-eslint/no-namespace": "off",
        "unicorn/no-array-reduce": "off",
        "unicorn/no-null": "off"
    },
    overrides: [
        /**
         * These rules apply only to src (i.e. not scripts or tests)
         */
        {
            files: ["**/src/**"],
            excludedFiles: "**/__tests__/**",
            rules: {
                /**
                 * Keep functions and files concise and readable
                 */
                // TODO [2022-05-31] Reenable these rules
                // complexity: ["error", 10],
                // "max-depth": ["error", 5],
                // "max-lines": ["error", 250],
                // "max-lines-per-function": ["error", 50],
                // "max-statements": ["error", 10],
                /**
                 * In tests and scripts, we can safely import from the monorepo's root devDependencies,
                 * so no need to worry about checking imports beyond what TypeScript does by default.
                 **/
                "import/no-extraneous-dependencies": "error"
            }
        },
        /**
         * These rules apply only to tests
         */
        {
            files: ["**/__tests__/**"],
            rules: {
                "@typescript-eslint/no-empty-function": "off",
                "unicorn/consistent-function-scoping": "off",
                "unicorn/numeric-separators-style": "off"
            }
        },
        // Docusaurus requires pages export a default component
        {
            files: ["@re-/docs/src/pages/*"],
            rules: {
                "import/no-default-export": "off"
            }
        }
    ]
})
