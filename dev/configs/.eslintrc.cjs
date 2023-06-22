const { defineConfig } = require("eslint-define-config")

module.exports = defineConfig({
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
        "prefer-arrow-functions",
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
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": [
            "error",
            {
                patterns: [
                    {
                        group: [
                            "../../dev/utils/src/*",
                            "!../../dev/utils/src/main.js"
                        ],
                        message:
                            'Deep importing from "dev/utils/*" is not allowed, please import directly from "dev/utils/src/main.js" instead'
                    },
                    {
                        group: [
                            "../../dev/attest/*",
                            "!../../dev/attest/src/main.js"
                        ],
                        message:
                            'Deep importing from "dev/attest/*" is not allowed, please import from "dev/attest/src/main.js" instead'
                    }
                ],
                paths: [
                    "error",
                    "dist",
                    "node_modules",
                    "dist",
                    "node:assert",
                    "node:buffer",
                    "node:child_process",
                    "node:cluster",
                    "node:crypto",
                    "node:dgram",
                    "node:dns",
                    "node:domain",
                    "node:events",
                    "node:freelist",
                    "node:fs",
                    "node:http",
                    "node:https",
                    "node:module",
                    "node:net",
                    "node:os",
                    "node:path",
                    "node:node:punycode",
                    "node:querystring",
                    "node:readline",
                    "node:repl",
                    "node:smalloc",
                    "node:stream",
                    "node:string_decoder",
                    "node:sys",
                    "node:timers",
                    "node:tls",
                    "node:tracing",
                    "node:tty",
                    "node:url",
                    "node:util",
                    "node:vm",
                    "node:zlib"
                ]
            }
        ],
        /**
         * Allow more flexible typing
         */
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        /**
         * Ensure node imports are easily distinguished
         */
        "unicorn/prefer-node-protocol": "warn",
        /**
         * Namespaces are useful for grouping generic types with related functionality
         */
        "@typescript-eslint/no-namespace": "off",
        // More of a pain during dev (or testing) than it's worth to prevent something that is trivially caught in PR
        "@typescript-eslint/no-empty-function": "off",
        // We don't use switches unless we are returning from them anyways
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
            files: ["./dev/**"],
            rules: {
                "@typescript-eslint/no-restricted-imports": "off"
            }
        }
    ]
})
