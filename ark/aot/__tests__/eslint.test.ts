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
				{ rules: { "@ark/aot/precompilable": ["warn", options] } }
			],
			{ filename }
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

	it("reports reads off a value that may be a Type", () => {
		const filename = fromHere("unsure", "main.ts")
		attest(
			lint(readFileSync(filename, "utf8"), {}, filename, fromHere("unsure"))
		).snap([
			"5:44-5:51 form.or reads or, which a standalone validator lacks\nthe build can't tell where `form` comes from, so it may be a Type, which the standalone runtime replaces with a validator\nIf it isn't a Type, annotate it with its type. If it is, build with runtime: \"arktype\"."
		])
	})

	it("applies the members a build drops", () => {
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
	})

	it("refuses an island where errors are written for size", () => {
		const code = `import { type } from "arktype"
// @ark-runtime
export const User = type({ name: "string" })`
		attest(lint(code)).equals([])
		attest(lint(code, { optimizeErrors: "size" })).snap([
			'3:1-3:45 a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under optimizeErrors: "size"\na build writing its errors for size gives its validators a runtime of their own\nPrecompile the definition, or build with optimizeErrors: "speed".'
		])
	})

	it("accepts transforms a build copies", () => {
		const code = `import { type } from "arktype"
export const Tagged = type({
	"tags?": ["object", ["string", "=", "none"]],
	"[string]": { "[string]": { label: ["string", "=", "none"] } }
})`
		attest(lint(code, { mutatesInput: "always" })).equals([])
	})

	it("applies the configuration", () => {
		const code = `import "../writers/config.ts"
import { type } from "arktype"
const isLong = s => s.length > 3
export const Long = type("string").narrow(isLong)`
		attest(lint(code)).equals([])
		attest(lint(code, { config: "../writers/config.ts" })).snap([
			'4:21-4:50 type("string").narrow(isLong) can\'t be precompiled yet\n`node.expression` (../writers/config.ts:5:38) prints the name of `isLong` (linted.js:3:16), which the build knows only by a placeholder\nStandalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
		])
	})

	it("applies a changed configuration", () => {
		const dir = writeFixture({
			"config.ts": readFileSync(fromHere("writers", "config.ts"), "utf8")
		})
		const config = join(dir, "config.ts")
		const code = `import { type } from "arktype"
const isLong = s => s.length > 3
export const Long = type("string").narrow(isLong)`
		attest(lint(code, { config }, join(dir, "linted.js"), dir)).snap([
			'3:21-3:50 type("string").narrow(isLong) can\'t be precompiled yet\n`node.expression` (config.ts:5:38) prints the name of `isLong` (linted.js:2:16), which the build knows only by a placeholder\nStandalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
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
			'3:22-3:46 type(`string <= ${max}`) cannot be precompiled\n`max` is imported from limits.ts\n`process` is a global the build does not read\nStandalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
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

	it("rereads a referenced tsconfig's paths", () => {
		const code = `import { type } from "arktype"
import { shape } from "#shape"
export const T = type(shape)`
		const dir = writeFixture({
			"tsconfig.json": JSON.stringify({
				files: [],
				references: [{ path: "./tsconfig.app.json" }]
			}),
			"a.js": 'export const shape = { [String(Math.random())]: "string" }\n',
			"b.js": 'export const shape = { a: "number" }\n',
			"main.js": code
		})
		const writeTsconfig = (target: string) =>
			writeFileSync(
				join(dir, "tsconfig.app.json"),
				JSON.stringify({
					compilerOptions: { allowJs: true, paths: { "#shape": [target] } },
					include: ["*.js"]
				})
			)
		writeTsconfig("./a.js")
		attest(lint(code, {}, join(dir, "main.js"), dir)).snap([
			'3:18-3:29 type(shape) cannot be precompiled\n`shape` is imported from a.js\n`Math.random` is not one of the build\'s pure built-ins\nStandalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
		])
		writeTsconfig("./b.js")
		attest(lint(code, {}, join(dir, "main.js"), dir)).equals([])
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
