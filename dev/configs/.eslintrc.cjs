const { defineConfig } = require("eslint-define-config")

module.exports = defineConfig({
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
        "prefer-arrow-functions",
        "import",
        "only-warn"
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/typescript",
        "prettier"
    ],
    ignorePatterns: [
        "**/dist/**",
        "**/node_modules**",
        "**/*js",
        "**/generated/**"
    ],
    rules: {
        /**
         * General restrictions
         */
        curly: "warn",
        eqeqeq: "warn",
        "object-shorthand": ["warn"],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                ignoreRestSiblings: true,
                args: "after-used",
                argsIgnorePattern: "^__",
                varsIgnorePattern: "^__"
            }
        ],
        "@typescript-eslint/default-param-last": "warn",
        "@typescript-eslint/consistent-type-imports": "warn",
        "@typescript-eslint/no-empty-interface": "off",
        /**
         * Require the use of arrow functions where possible
         */
        "prefer-arrow-functions/prefer-arrow-functions": [
            "warn",
            {
                disallowPrototype: true
            }
        ],
        /**
         * Imports
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
        // TODO: Ensure this works correctly
        "import/no-relative-packages": "warn",
        "import/no-nodejs-modules": "warn",
        /**
         * Allow more flexible typing
         */
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        /**
         * Namespaces are useful for grouping generic types with related functionality
         */
        "@typescript-eslint/no-namespace": "off",
        // More of a pain during dev (or testing) than it's worth to prevent something that is trivially caught in PR
        "@typescript-eslint/no-empty-function": "off",
        // We primarily use switches onyl if we're returning, and it's hard to imagine where this would be a problem
        "no-case-declarations": "off"
    },
    overrides: [
        /**
         * These rules apply only to src (i.e. not scripts or tests)
         */
        {
            files: ["**/src/**"],
            rules: {
                /**
                 * In tests and scripts, we can safely import from the monorepo's root devDependencies,
                 * so no need to worry about checking imports beyond what TypeScript does by default.
                 **/
                "import/no-extraneous-dependencies": "warn"
            }
        },
        {
            files: ["**/*.bench.ts"],
            rules: {
                // Assignment to a variable is required to ensure types are parsed
                "@typescript-eslint/no-unused-vars": "off"
            }
        },
        {
            files: ["./dev/examples/*.ts"],
            rules: {
                "@typescript-eslint/no-unused-vars": "off"
            }
        },
        {
            files: [
                "./dev/scripts/**",
                "./dev/examples/**",
                "./dev/configs/**",
                "./dev/arkdark/**",
                "./dev/attest/**"
            ],
            rules: {
                "import/no-nodejs-modules": "off"
            }
        }
    ]
})
