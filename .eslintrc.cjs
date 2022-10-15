const { defineConfig } = require("eslint-define-config")

module.exports = defineConfig({
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
        "prefer-arrow",
        "import",
        "unicorn",
        "only-warn"
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/typescript",
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
    ignorePatterns: [
        "**/dist/**",
        "**/__snippets__/**",
        "**/*js",
        "**/generated/**"
    ],
    rules: {
        /**
         * General restrictions
         */
        curly: "warn",
        eqeqeq: "warn",
        "no-param-reassign": "warn",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { ignoreRestSiblings: true }
        ],
        "@typescript-eslint/default-param-last": "warn",
        "@typescript-eslint/consistent-type-imports": "warn",
        "object-shorthand": ["warn"],
        /**
         * Conventions
         */
        "import/no-default-export": "warn",
        /**
         * Require the use of arrow functions where possible
         */
        "func-style": ["warn", "expression"],
        "prefer-arrow/prefer-arrow-functions": [
            "warn",
            {
                disallowPrototype: true,
                singleReturnOnly: false,
                classPropertiesAllowed: false
            }
        ],
        "prefer-arrow-callback": ["warn", { allowNamedFunctions: true }],
        /**
         * Organize imports
         */
        "import/no-duplicates": "warn",
        // Sort import statements
        "import/order": [
            "warn",
            {
                alphabetize: {
                    order: "asc"
                }
            }
        ],
        // Sort destructured variables within a single import statement
        "sort-imports": [
            "warn",
            {
                ignoreCase: true,
                ignoreDeclarationSort: true
            }
        ],
        /**
         * Keep functions and files concise and readable
         */
        "max-statements": ["warn", 16],
        "max-lines-per-function": [
            "warn",
            { max: 32, skipComments: true, skipBlankLines: true }
        ],
        "max-lines": ["warn", 256],
        /**
         * Allow more flexible typing
         */
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        /**
         * ESM support, clarity
         */
        "unicorn/prefer-module": "warn",
        "unicorn/prefer-node-protocol": "warn",
        /**
         * Namespaces are useful for grouping generic types with related functionality
         */
        "@typescript-eslint/no-namespace": "off",
        // More of a pain during dev (or testing) than it's worth to prevent something that is trivially caught in PR
        "@typescript-eslint/no-empty-function": "off"
    },
    overrides: [
        /**
         * These rules apply only to src (i.e. not scripts or tests)
         */
        {
            files: ["**/src/**"],
            excludedFiles: ["**/__tests__/**"],
            rules: {
                /**
                 * In tests and scripts, we can safely import from the monorepo's root devDependencies,
                 * so no need to worry about checking imports beyond what TypeScript does by default.
                 **/
                "import/no-extraneous-dependencies": "warn"
            }
        },
        {
            files: ["**/*.test.ts", "**/*.bench.ts"],
            rules: {
                // Does not play well with "describe" or "suite" blocks
                "max-lines-per-function": "off"
            }
        },
        {
            files: ["**/*.bench.ts"],
            rules: {
                // Assignment to a variable is required to ensure types are parsed
                "@typescript-eslint/no-unused-vars": "off"
            }
        },
        // Docusaurus requires pages export a default component
        {
            files: ["redo.dev/src/pages/*", "arktype.io/src/pages/*"],
            rules: {
                "import/no-default-export": "off"
            }
        },
        // Components that are mostly just SVG data with some theme injections
        {
            files: ["redo.dev/**/svg/*.tsx", "arktype.io/**/svg/*.tsx"],
            rules: {
                "max-lines": "off",
                "max-lines-per-function": "off"
            }
        }
    ]
})
