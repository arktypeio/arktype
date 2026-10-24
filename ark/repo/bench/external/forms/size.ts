// Sizes valibot.dev's login form, written in each library as its docs do (see each file), with bundlejs's esbuild
// settings as login/size.ts uses them (esm, minify, tree shaking, browser, esnext, the "production" condition) and
// gzip level 9. ArkType is precompiled with its default options. Each bundle exports a validate that reports every
// error; it is written to out/ and then run on the same inputs, so behavior.json records what each one reports.
// typia's form is compiled first (`ttsc --project tsconfig.typia.json`); ajv's is its standalone code with
// ajv-errors.
// npm i --prefix ark/repo/bench/external/forms && node forms/size.ts <sizes.json> <behavior.json>
import { precompile } from "@ark/aot/unplugin"
import { Ajv } from "ajv"
import ajvErrors from "ajv-errors"
import addFormats from "ajv-formats"
import standaloneCode from "ajv/dist/standalone/index.js"
import { build } from "esbuild"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { gzipSync } from "node:zlib"
import { schema } from "./ajv.ts"

const [sizesPath, behaviorPath] = process.argv.slice(2)
// the bundles target browsers, where Joi's reads `self`
;(globalThis as { self?: unknown }).self ??= globalThis
const here = import.meta.dirname
const out = join(here, "out")
mkdirSync(out, { recursive: true })

const ajv = new Ajv({
	allErrors: true,
	unicode: false,
	code: { source: true, esm: true }
})
addFormats.default(ajv, { formats: ["email"] })
ajvErrors.default(ajv)
writeFileSync(
	join(out, "ajvStandalone.js"),
	standaloneCode.default(ajv, ajv.compile(schema))
)
writeFileSync(
	join(out, "ajv.js"),
	`import check from "./ajvStandalone.js"
export const validate = data => {
	if (check(data)) return data
	throw new Error(check.errors.map(e => e.message).join("\\n"))
}
`
)

const forms: Record<string, string> = {
	"ArkType (precompiled, default)": "arktype.ts",
	"ArkType (precompiled, smallest)": "arktype.ts",
	"ArkType (dynamic)": "arktype.ts",
	Valibot: "valibot.ts",
	Zod: "zod.ts",
	"Zod Mini": "zodMini.ts",
	"typia (createValidate)": "out/typia/typia.js",
	"TypeBox (TypeCompiler)": "typeboxCompiler.ts",
	"TypeBox (Value)": "typeboxValue.ts",
	"Effect Schema": "effect.ts",
	runtypes: "runtypes.ts",
	Superstruct: "superstruct.ts",
	Yup: "yup.ts",
	Joi: "joi.ts",
	"ajv (standalone, ajv-errors)": "out/ajv.js"
}

const inputs = {
	empty: {},
	blank: { email: "", password: "" },
	invalid: { email: "ada", password: "short" },
	valid: { email: "ada@example.com", password: "correct horse" }
}

// every message a library's thrown error carries, wherever it keeps them
const messagesOf = (e: any): string => {
	const all: unknown[] =
		Array.isArray(e.issues) ? e.issues.map((i: any) => i.message)
		: typeof e.failures === "function" ? e.failures().map((f: any) => f.message)
		: Array.isArray(e.errors) && typeof e.errors[0] === "string" ? e.errors
		: Array.isArray(e.details) ? e.details.map((d: any) => d.message)
		: e.failure?.details ?
			Object.values(e.failure.details).map((d: any) => d.message)
		: e.details ? [JSON.stringify(e.details)]
		: [e.message]
	return all.join(" | ")
}

const sizes: Record<string, { min: number; gzip: number }> = {}
const behavior: Record<string, Record<string, string>> = {}
for (const [name, file] of Object.entries(forms)) {
	const { outputFiles } = await build({
		entryPoints: [join(here, file)],
		absWorkingDir: here,
		bundle: true,
		minify: true,
		treeShaking: true,
		format: "esm",
		platform: "browser",
		target: "esnext",
		conditions: ["production"],
		write: false,
		logLevel: "error",
		plugins:
			name.startsWith("ArkType (precompiled") ?
				[
					precompile.esbuild({
						cwd: here,
						...(name.includes("smallest") && { preset: "smallest" })
					})
				]
			:	[]
	})
	const code = outputFiles[0].text
	sizes[name] = {
		min: Buffer.byteLength(code),
		gzip: gzipSync(code, { level: 9 }).length
	}
	const path = join(out, `${name.replace(/\W+/g, "-")}.mjs`)
	writeFileSync(path, code)
	const { validate } = await import(pathToFileURL(path).href)
	behavior[name] = {}
	for (const [input, data] of Object.entries(inputs)) {
		try {
			validate(structuredClone(data))
			behavior[name][input] = "ok"
		} catch (e) {
			behavior[name][input] = messagesOf(e)
		}
	}
}

console.table(sizes)
writeFileSync(sizesPath, `${JSON.stringify(sizes, null, "\t")}\n`)
writeFileSync(behaviorPath, `${JSON.stringify(behavior, null, "\t")}\n`)
