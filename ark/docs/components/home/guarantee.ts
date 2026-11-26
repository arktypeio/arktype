/**
 * A definition the build can't precompile, and what the build says about
 * it. The homepage prints the second; `__tests__/guarantee.test.ts` runs
 * @ark/aot's check on the first and fails if what it reports is no longer
 * these lines, so the page never shows a message the tool doesn't write.
 */
export const refused = {
	file: "src/limits.ts",
	source: `import { type } from "arktype"

const max = Number(process.env.MAX_NAME)

export const Name = type(\`string <= \${max}\`)
`
}

/** `ark check "src/**\/*.ts"` on a project holding only that file */
export const diagnostic = {
	at: "src/limits.ts:5:21",
	what: "type(`string <= ${max}`) cannot be precompiled",
	why: [
		"`max` is `Number(process.env.MAX_NAME)` (src/limits.ts:3:7)",
		"`process` is a global the build does not read"
	],
	fix: "Replace `process.env.MAX_NAME` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime."
}

/** the lines as the check reports them: the site and what, then each reason and the fix indented under it */
export const diagnosticLines = [
	`${diagnostic.at}  ${diagnostic.what}`,
	...diagnostic.why.map(reason => `  ${reason}`),
	`  ${diagnostic.fix}`
]
