// @ts-check
const { defineConfig } = require("eslint-define-config")

const noCrossPackageImportPattern = {
	group: [
		"**/fs/**",
		"**/attest/**",
		"**/schema/**",
		"**/type/**",
		"**/util/**",
		"arktype/internal/**"
	],
	message: `Use a specifier like '@ark/util' to import from a package`
}

module.exports = defineConfig({
	parser: "@typescript-eslint/parser",
	plugins: [
		"@typescript-eslint",
		"import",
		"only-warn",
		"prefer-arrow-functions"
	],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:import/typescript",
		"prettier"
	],
	settings: {
		"import/parsers": {
			"@typescript-eslint/parser": ["ts", "tsx"]
		},
		"import/resolver": {
			typescript: true,
			node: true
		}
	},
	ignorePatterns: [
		"**/dist/**",
		"**/out/**",
		"**/node_modules/**",
		"**/*js",
		"*.astro",
		"*scratch.ts",
		"**/scratch/**",
		"**/examples/**"
	],
	rules: {
		/**
		 * General restrictions
		 */
		eqeqeq: "warn",
		curly: ["warn", "multi-or-nest"],
		"no-lone-blocks": "warn",
		"object-shorthand": "warn",
		/**
		 * Require the use of arrow functions where possible
		 */
		"prefer-arrow-functions/prefer-arrow-functions": [
			"warn",
			{
				disallowPrototype: true
			}
		],
		"arrow-body-style": ["warn", "as-needed"],
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{
				args: "after-used",
				argsIgnorePattern: "^_",
				ignoreRestSiblings: true
			}
		],
		"@typescript-eslint/default-param-last": "warn",
		"@typescript-eslint/no-empty-interface": "off",
		/**
		 * Imports
		 */
		"import/no-cycle": "warn",
		"@typescript-eslint/explicit-module-boundary-types": [
			"warn",
			{
				allowArgumentsExplicitlyTypedAsAny: true
			}
		],
		"@typescript-eslint/consistent-type-imports": [
			"warn",
			{ fixStyle: "inline-type-imports" }
		],
		"@typescript-eslint/no-import-type-side-effects": "warn",
		"import/no-duplicates": ["warn", { "prefer-inline": true }],
		// Per the typescript-eslint docs: "you must disable the base rule as it can report incorrect errors"
		"no-restricted-imports": "off",
		"@typescript-eslint/no-restricted-imports": [
			"warn",
			{
				patterns: [
					noCrossPackageImportPattern,
					{
						group: ["**/index.js", "!**/structure/index.js"],
						message: `Use a path like '../original/definition.js' instead of a package entrypoint`
					},
					{
						group: ["arktype/config"],
						message: `Use a relative path to ark/type/config.ts instead`
					}
				]
			}
		],
		/**
		 * Allow more flexible typing
		 */
		"@typescript-eslint/no-empty-object-type": "off",
		"@typescript-eslint/no-unsafe-function-type": "off",
		"@typescript-eslint/no-wrapper-object-types": "off",
		"@typescript-eslint/ban-types": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-unsafe-declaration-merging": "off",
		/**
		 * Namespaces are useful for grouping generic types with related functionality
		 */
		"@typescript-eslint/no-namespace": "off",
		// More of a pain during dev (or testing) than it's worth to prevent something that is trivially caught in PR
		"@typescript-eslint/no-empty-function": "off",
		// This rule is not needed in a modern codebase
		"@typescript-eslint/no-this-alias": "off",
		// We primarily use switches only if we're returning, and it's hard to imagine where this would be a problem
		"no-case-declarations": "off",
		/** In tests we use expect-error constantly, but in src if we
		 * ever have to there should be an explanation */
		"@typescript-eslint/ban-ts-comment": [
			"warn",
			{
				// some errors are environment dependent or e.g. don't appear in build output
				"ts-ignore": "allow-with-description"
			}
		]
	},
	overrides: [
		{
			/**
			 * In tests and scripts, we can safely import from the monorepo's root devDependencies,
			 * so no need to worry about checking imports beyond what TypeScript does by default.
			 **/
			files: ["**/ark/type/**", "**/ark/schema/**", "**/ark/util/**"],
			rules: {
				"import/no-nodejs-modules": "warn",
				"import/no-extraneous-dependencies": "warn"
			}
		},

		{
			// Amend the index.js import restriction to allow for relative imports of
			// ark/schema/structure/index.js, since it is for IndexNode, not a barrel file
			files: ["**/ark/schema/structure/**"],
			rules: {
				"@typescript-eslint/no-restricted-imports": [
					"warn",
					{
						patterns: [
							noCrossPackageImportPattern,
							{
								// still restrict import from package entrypoints (relative parents)
								group: ["../**/index.js"],
								message: `Use a path like '../original/definition.js' instead of a package entrypoint`
							}
						]
					}
				]
			}
		},
		{
			// These also shouldn't have extraneous dependencies but can use node builtins
			files: ["**/ark/attest/**", "**/ark/fs/**", "**/ark/docs/**"],
			rules: {
				"import/no-extraneous-dependencies": "warn"
			}
		},
		{
			files: ["**/ark/repo/**", "**/ark/docs/**"],
			rules: {
				"@typescript-eslint/explicit-module-boundary-types": "off"
			}
		},
		{
			files: ["**/__tests__/**", "**/*.bench.ts", "**/*.test.ts"],
			rules: {
				// Assignment to a variable is required to ensure types are parsed
				"@typescript-eslint/no-unused-vars": "off",
				"@typescript-eslint/ban-ts-comment": "off",
				"@typescript-eslint/explicit-module-boundary-types": "off",
				"import/no-extraneous-dependencies": "off",
				"import/no-nodejs-modules": "off",
				"@typescript-eslint/no-restricted-imports": [
					"warn",
					{
						patterns: [
							{
								group: ["../**"],
								message:
									"Tests must import from package entrypoints (use /internal if necessary)"
							}
						]
					}
				]
			}
		}
	]
})
