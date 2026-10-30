import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { configs } from "@ark/aot/eslint"
import { Linter } from "eslint"
import { readFileSync, utimesSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tempDir, writeFixture } from "./utils.ts"

const lint = (
	code: string,
	options: object = {},
	filename = fromHere("checked", "linted.js"),
	cwd = fromHere("checked")
) =>
	new Linter({ configType: "flat", cwd })
		.verify(
			code,
			[
				{ files: ["**/*.{js,ts}"], ...configs.recommended },
				{
					rules: {
						"@ark/aot/precompilable": ["warn", options],
						"@ark/aot/warnings": ["warn", options]
					}
				}
			],
			{ filename }
		)
		.map(
			message =>
				`${message.line}:${message.column}-${message.endLine}:${message.endColumn} ${message.message}`
		)

contextualize(() => {
	it("lints TypeScript files with the recommended configuration alone", () => {
		attest(
			new Linter({ configType: "flat", cwd: fromHere("checked") })
				.verify(
					'import { type } from "arktype"\nexport const fields = [1, 2].map(limit => type(`string <= ${limit}`))\n',
					[configs.recommended],
					{ filename: fromHere("checked", "linted.ts") }
				)
				.map(message => `${message.line}:${message.column} ${message.ruleId}`)
		).equals(["2:43 @ark/aot/precompilable"])
	})

	it("reports what fails the build as an error, and its warnings as warnings", () => {
		const severities = (...overrides: Linter.Config[]) =>
			new Linter({ configType: "flat", cwd: fromHere("checked") })
				.verify(
					'import { type } from "arktype"\nexport const A = type("string & number")\nexport const fields = [1, 2].map(limit => type(`string <= ${limit}`))\n',
					[configs.recommended, ...overrides],
					{ filename: fromHere("checked", "linted.ts") }
				)
				.map(
					message =>
						`${message.line}:${message.column} ${message.ruleId} ${message.severity === 2 ? "error" : "warning"}`
				)
		attest(severities()).equals([
			"2:18 @ark/aot/precompilable error",
			"3:43 @ark/aot/precompilable error"
		])
		const unsafe = { allowUnsafe: true }
		attest(
			severities({
				rules: {
					"@ark/aot/precompilable": ["error", unsafe],
					"@ark/aot/warnings": ["warn", unsafe]
				}
			})
		).equals([
			"2:18 @ark/aot/warnings warning",
			"3:43 @ark/aot/precompilable error"
		])
	})

	it("reports sites that cannot be precompiled", () => {
		attest(
			lint(`import { type } from "arktype"
export const User = type({ name: "string" })
export const makeField = limit => {
	let Field = type(\`string <= \${limit}\`)
	return Field
}`)
		).snap([
			"4:14-4:40 type(`string <= ${limit}`) cannot be precompiled\n`limit` is a parameter of makeField (linted.js:3:26); its value is known only at runtime\nWrite the definition where makeField is called, with the value it passes for `limit`, so the build precompiles each call."
		])
	})

	it("reports reads off a value that may be a Type", () => {
		const code = `import { type } from "arktype"

const forms = [type({ name: "string" }), type({ role: "string" })]

export const nullables = forms.map(form => form.or("null"))`
		const dir = writeFixture({ "main.ts": code })
		attest(lint(code, {}, join(dir, "main.ts"), dir)).snap([
			"5:44-5:51 form.or reads or, which a standalone validator lacks\nthe build can't tell where `form` comes from, so it may be a Type, which the standalone runtime replaces with a validator\nIf it isn't a Type, annotate it with its type. If it is, build with runtime: \"arktype\"."
		])
	})

	it("applies the build's members and mutatesInput", () => {
		const code = `import { type } from "arktype"
export const User = type({ name: "string" })
export const check = data => User.assert(data)`
		attest(lint(code)).equals([])
		attest(lint(code, { members: { assert: false } })).snap([
			'3:30-3:41 User.assert reads assert, which a standalone validator lacks\nthe build\'s `members` option sets "assert" false, so no validator has assert\nLeave members["assert"] unset if the program reads it.'
		])
		attest(() => lint(code, { members: { asserts: false } })).throws
			.snap(`Error: Key "rules": Key "@ark/aot/precompilable":
	Value {"asserts":false} should NOT have additional properties.
		Unexpected property "asserts". Expected properties: "assert", "meta", "~standard", "methods", "expression", "description", "json", "toJSON", "toJsonSchema", "~standard.jsonSchema".
`)
		// a build that copies its input accepts transforms
		const tagged = `import { type } from "arktype"
export const Tagged = type({
	"tags?": ["object", ["string", "=", "none"]],
	"[string]": { "[string]": { label: ["string", "=", "none"] } }
})`
		attest(lint(tagged, { mutatesInput: "always" })).equals([])
	})

	it("applies a changed configuration", () => {
		const dir = writeFixture({
			"config.ts": readFileSync(fromHere("writers", "config.ts"), "utf8")
		})
		const config = join(dir, "config.ts")
		const code = `import { type } from "arktype"
const isLong = s => s.length > 3
export const Long = type("string").narrow(isLong)`
		attest(lint(code, {}, join(dir, "linted.js"), dir)).equals([])
		attest(lint(code, { config }, join(dir, "linted.js"), dir)).snap([
			"3:21-3:50 type(\"string\").narrow(isLong) can't be precompiled yet\n`node.expression` (config.ts:5:38) prints the name of `isLong` (linted.js:2:16), which the build knows only by a placeholder\nStandalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
		])
		writeFileSync(
			config,
			`import { configure } from "arktype/config"

configure({ predicate: { description: () => "satisfying a predicate" } })
`
		)
		attest(lint(code, { config }, join(dir, "linted.js"), dir)).equals([])
	})

	it("rereads a module once it changes", () => {
		const dir = writeFixture({ "limits.ts": "export const max = 5\n" })
		const code = `import { type } from "arktype"
import { max } from "./limits.ts"
export const Field = type(\`string <= \${max}\`)`
		const filename = join(dir, "field.js")
		attest(lint(code, {}, filename, dir)).equals([])
		const limits = join(dir, "limits.ts")
		writeFileSync(limits, "export const max = Number(process.env.MAX)\n")
		utimesSync(limits, new Date(Date.now() + 1000), new Date(Date.now() + 1000))
		attest(lint(code, {}, filename, dir)).snap([
			"3:22-3:46 type(`string <= ${max}`) cannot be precompiled\n`max` is imported from limits.ts\n`process` is a global the build does not read\nReplace `process.env.MAX` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime."
		])
	})

	it("reads a module from its file, not as linted unsaved", () => {
		const limitsWith = (max: string) => `import { type } from "arktype"
export const max = ${max}
export const Max = type("number")
`
		const dir = writeFixture({ "limits.ts": limitsWith("5") })
		attest(
			lint(
				limitsWith("Number(process.env.MAX)"),
				{},
				join(dir, "limits.ts"),
				dir
			)
		).equals([])
		const code = `import { type } from "arktype"
import { max } from "./limits.ts"
export const Field = type(\`string <= \${max}\`)`
		attest(lint(code, {}, join(dir, "field.js"), dir)).equals([])
	})

	it("applies an unsaved config module", () => {
		const configWith = (onUndeclaredKey: string) =>
			`import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: ${onUndeclaredKey} })\n`
		const code = `import { type } from "arktype"
export const T = type({ a: "string" })`
		const dir = writeFixture({
			"config.ts": configWith('"reject"'),
			"main.ts": code
		})
		const config = join(dir, "config.ts")
		attest(lint(code, { config }, join(dir, "main.ts"), dir)).equals([])
		attest(
			lint(
				configWith('process.argv.length > 99 ? "delete" : "reject"'),
				{ config },
				config,
				dir
			)
		).snap([
			"3:1-3:79 configure({ onUndeclaredKey: process.argv.length > 99 ? \"de… is not static\n`process` is a global the build does not read\nThe configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
		])
	})
})
