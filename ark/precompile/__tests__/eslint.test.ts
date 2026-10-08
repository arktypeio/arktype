import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { configs } from "@ark/precompile/eslint"
import { Linter } from "eslint"

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

	it("takes defines", () => {
		const code = `import { type } from "arktype"
export const Field = type(\`string <= \${process.env.MAX}\`)`
		attest(lint(code).length).equals(1)
		attest(lint(code, { define: { "process.env.MAX": 5 } })).equals([])
	})
})
