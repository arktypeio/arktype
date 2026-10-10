import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { configs } from "@ark/precompile/eslint"
import { Linter } from "eslint"
import { mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

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
				{ rules: { "@ark/precompile/precompilable": ["warn", options] } }
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

	it("rereads a module an earlier file read once it changes", () => {
		const limits = fromHere("temp", "linted", "limits.ts")
		mkdirSync(dirname(limits), { recursive: true })
		const code = `import { type } from "arktype"
import { max } from "./limits.ts"
export const Field = type(\`string <= \${max}\`)`
		const filename = fromHere("temp", "linted", "field.js")
		writeFileSync(limits, "export const max = 5\n")
		attest(lint(code, {}, filename, fromHere())).equals([])
		writeFileSync(limits, "export const max = Number(process.env.MAX)\n")
		utimesSync(limits, new Date(Date.now() + 1000), new Date(Date.now() + 1000))
		attest(lint(code, {}, filename, fromHere())).snap([
			'3:22-3:46 type(`string <= ${max}`) cannot be precompiled\n`max` is imported from temp/linted/limits.ts\n`process.env.MAX` is not a build define\nStandalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
		])
	})

	it("reads a module from its file for a later file, not as it was linted unsaved", () => {
		const limits = fromHere("temp", "linted", "limits.ts")
		mkdirSync(dirname(limits), { recursive: true })
		const limitsWith = (max: string) => `import { type } from "arktype"
export const max = ${max}
export const Max = type("number")
`
		writeFileSync(limits, limitsWith("5"))
		attest(
			lint(limitsWith("Number(process.env.MAX)"), {}, limits, fromHere())
		).equals([])
		const code = `import { type } from "arktype"
import { max } from "./limits.ts"
export const Field = type(\`string <= \${max}\`)`
		attest(
			lint(code, {}, fromHere("temp", "linted", "field.js"), fromHere())
		).equals([])
	})

	it("rereads what an import resolves to once a referenced tsconfig's paths change", () => {
		const main = fromHere("temp", "referenced", "main.js")
		mkdirSync(dirname(main), { recursive: true })
		const writeTsconfig = (target: string) =>
			writeFileSync(
				fromHere("temp", "referenced", "tsconfig.app.json"),
				JSON.stringify({
					compilerOptions: { allowJs: true, paths: { "#shape": [target] } },
					include: ["*.js"]
				})
			)
		writeFileSync(
			fromHere("temp", "referenced", "tsconfig.json"),
			JSON.stringify({
				files: [],
				references: [{ path: "./tsconfig.app.json" }]
			})
		)
		writeFileSync(
			fromHere("temp", "referenced", "a.js"),
			'export const shape = { [String(Math.random())]: "string" }\n'
		)
		writeFileSync(
			fromHere("temp", "referenced", "b.js"),
			'export const shape = { a: "number" }\n'
		)
		const code = `import { type } from "arktype"
import { shape } from "#shape"
export const T = type(shape)`
		writeFileSync(main, code)
		writeTsconfig("./a.js")
		attest(lint(code, {}, main, fromHere()).length).equals(1)
		writeTsconfig("./b.js")
		attest(lint(code, {}, main, fromHere())).equals([])
	})

	it("applies a config module as it's linted unsaved", () => {
		const config = fromHere("temp", "unsaved", "config.ts")
		mkdirSync(dirname(config), { recursive: true })
		const configWith = (onUndeclaredKey: string) =>
			`import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: ${onUndeclaredKey} })\n`
		writeFileSync(config, configWith('"reject"'))
		const main = fromHere("temp", "unsaved", "main.ts")
		const code = `import { type } from "arktype"
export const T = type({ a: "string" })`
		writeFileSync(main, code)
		attest(lint(code, { config }, main, fromHere())).equals([])
		attest(
			lint(
				configWith('process.argv.length > 99 ? "delete" : "reject"'),
				{ config },
				config,
				fromHere()
			)
		).snap([
			"3:1-3:79 configure({ onUndeclaredKey: process.argv.length > 99 ? \"de… is not static\n`process` is a global the build does not read\nThe configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module."
		])
	})

	it("reports only the copies of arktype's packages the linted file reaches", () => {
		const code = `import { type } from "arktype"
export const Name = type("string")`
		const options = { conditions: ["ark-ts"] }
		attest(
			lint(code, options, fromHere("checked", "linted.js"), fromHere())
		).equals([])
		attest(
			lint(code, options, fromHere("keywordTable", "linted.ts"), fromHere())
		).equals([])
	})

	it("takes defines", () => {
		const code = `import { type } from "arktype"
export const Field = type(\`string <= \${process.env.MAX}\`)`
		attest(lint(code).length).equals(1)
		attest(lint(code, { define: { "process.env.MAX": 5 } })).equals([])
	})
})
