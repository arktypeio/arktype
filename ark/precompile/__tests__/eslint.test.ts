import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { configs } from "@ark/precompile/eslint"
import { Linter } from "eslint"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const lint = (code: string, options: object = {}) =>
	new Linter({ configType: "flat", cwd: fromHere("checked") })
		.verify(
			code,
			[
				{ files: ["**/*.js"], ...configs.recommended },
				{ rules: { "@ark/precompile/precompilable": ["warn", options] } }
			],
			{ filename: fromHere("checked", "linted.js") }
		)
		.map(
			message =>
				`${message.line}:${message.column}-${message.endLine}:${message.endColumn} ${message.message}`
		)

contextualize(() => {
	it("reports sites that cannot be precompiled", () => {
		attest(
			lint(`import { type } from "arktype"
export const User = type({ name: "string" })
export const makeField = limit => {
	const Field = type(\`string <= \${limit}\`)
	return Field
}`)
		).snap([
			'4:16-4:42 type(`string <= ${limit}`) cannot be precompiled\n`limit` is a parameter of makeField (linted.js:3:26); its value is known only at runtime\nStandalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
		])
	})

	it("applies the configuration", () => {
		const code = `import "../writers/config.ts"
import { type } from "arktype"
const isLong = s => s.length > 3
export const Long = type("string").narrow(isLong)`
		attest(lint(code)).equals([])
		attest(lint(code, { config: "../writers/config.ts" })).snap([
			'4:21-4:50 type("string").narrow(isLong) can\'t be precompiled to a standalone validator yet\n`node.expression` (../writers/config.ts:5:38) prints the name of `isLong` (linted.js:3:16), which the build knows only by a placeholder\nStandalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
		])
	})

	it("applies a configuration that changed since the last file", () => {
		const config = fromHere("temp", "linted", "config.ts")
		mkdirSync(dirname(config), { recursive: true })
		const code = `import { type } from "arktype"
const isLong = s => s.length > 3
export const Long = type("string").narrow(isLong)`
		writeFileSync(config, readFileSync(fromHere("writers", "config.ts")))
		attest(lint(code, { config }).length).equals(1)
		writeFileSync(
			config,
			`import { configure } from "arktype/config"

configure({ predicate: { description: () => "satisfying a predicate" } })
`
		)
		attest(lint(code, { config })).equals([])
	})

	it("takes defines", () => {
		const code = `import { type } from "arktype"
export const Field = type(\`string <= \${process.env.MAX}\`)`
		attest(lint(code).length).equals(1)
		attest(lint(code, { define: { "process.env.MAX": 5 } })).equals([])
	})
})
