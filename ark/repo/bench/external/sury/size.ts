// Sury's schema benchmark's bundle-size rows (packages/benchmarks/bundle.ts and
// topics/schema.ts at 1f035c5): each snippet bundled by the suite's esbuild
// with its options, minified, gzipped at level 9. Rivals resolve from the
// suite's package, as there; ArkType's snippet is the suite's, precompiled
// with the default options. Every snippet is built twice: as the suite builds
// it, and as a production build (esbuild's "production" condition), which is
// ArkType's registered build. ArkType's snippet is schema.ts, a file, as the
// precompiler doesn't read esbuild's stdin. Each bundle is then imported and
// its p run on the suite's value, so a size is only of a bundle that validates.
// Each library also has a check arm, its documented boolean check of the same
// schema (TypeBox's is its ahead-of-time Check, the code TypeCompiler.Code
// writes); a check must also reject a value with a string for a number
// SURY=<sury clone> node sury/size.ts <out.json>
import { precompile } from "@ark/aot/unplugin"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

const sury = process.env.SURY ?? "../sury"
const here = import.meta.dirname
const bench = join(sury, "packages/benchmarks")
const { build, version }: typeof import("esbuild") = await import(
	join(bench, "node_modules/esbuild/lib/main.js")
)
const { Type } = await import(
	join(bench, "node_modules/@sinclair/typebox/build/cjs/index.js")
)
const { TypeCompiler } = await import(
	join(bench, "node_modules/@sinclair/typebox/build/cjs/compiler/index.js")
)

const VALUE = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
	boolean: true,
	deeplyNested: { foo: "bar", num: 1, bool: false }
})

const FIELDS = {
	sury: "{ number: S.number, negNumber: S.number, maxNumber: S.number, string: S.string, longString: S.string, boolean: S.boolean, deeplyNested: { foo: S.string, num: S.number, bool: S.boolean } }",
	zod: "{ number: z.number(), negNumber: z.number(), maxNumber: z.number(), string: z.string(), longString: z.string(), boolean: z.boolean(), deeplyNested: z.object({ foo: z.string(), num: z.number(), bool: z.boolean() }) }",
	typebox:
		"{ number: Type.Number(), negNumber: Type.Number(), maxNumber: Type.Number(), string: Type.String(), longString: Type.String(), boolean: Type.Boolean(), deeplyNested: Type.Object({ foo: Type.String(), num: Type.Number(), bool: Type.Boolean() }) }",
	valibot:
		"{ number: v.number(), negNumber: v.number(), maxNumber: v.number(), string: v.string(), longString: v.string(), boolean: v.boolean(), deeplyNested: v.object({ foo: v.string(), num: v.number(), bool: v.boolean() }) }",
	arktype:
		'{ number: "number", negNumber: "number", maxNumber: "number", string: "string", longString: "string", boolean: "boolean", deeplyNested: { foo: "string", num: "number", bool: "boolean" } }'
}

// TypeBox's ahead-of-time Check: a function body, with no imports
const typeBoxCheck = TypeCompiler.Code(
	new Function("Type", `return Type.Object(${FIELDS.typebox})`)(Type),
	[],
	{ language: "javascript" }
)

const entries: Record<string, string> = {
	"Sury schema": `import * as S from "sury"; export const p = S.parseOrThrow(S.schema(${FIELDS.sury}));`,
	"Zod schema": `import { z } from "zod"; const M = z.object(${FIELDS.zod}); export const p = (x) => M.parse(x);`,
	"TypeBox schema": `import { Type } from "@sinclair/typebox"; import { TypeCompiler } from "@sinclair/typebox/compiler"; const C = TypeCompiler.Compile(Type.Object(${FIELDS.typebox})); export const p = (x) => C.Check(x);`,
	"Valibot schema": `import * as v from "valibot"; const M = v.object(${FIELDS.valibot}); export const p = (x) => v.parse(M, x);`,
	"ArkType (dynamic) schema": `import { type } from "arktype"; const M = type(${FIELDS.arktype}); export const p = (x) => M.assert(x);`,
	"Sury check": `import * as S from "sury"; export const p = S.isInput(S.schema(${FIELDS.sury}));`,
	"Zod check": `import { z } from "zod"; const M = z.object(${FIELDS.zod}); export const p = (x) => M.safeParse(x).success;`,
	"TypeBox check": `const C = (() => { ${typeBoxCheck} })(); export const p = (x) => C(x);`,
	"Valibot check": `import * as v from "valibot"; const M = v.object(${FIELDS.valibot}); export const p = (x) => v.is(M, x);`,
	"Sury all": `export * from "sury";`,
	"Zod all": `export * from "zod";`,
	"TypeBox all": `export * from "@sinclair/typebox"; export * from "@sinclair/typebox/compiler"; export * from "@sinclair/typebox/value";`,
	"Valibot all": `export * from "valibot";`,
	"ArkType (dynamic) all": `export * from "arktype";`
}

const sizeOf = async (
	code: string,
	resolveDir: string,
	production: boolean,
	precompiled?: string
) => {
	const { outputFiles } = await build({
		...(precompiled ?
			{ entryPoints: [join(here, precompiled)] }
		:	{ stdin: { contents: code, loader: "js", resolveDir } }),
		absWorkingDir: resolveDir,
		bundle: true,
		minify: true,
		treeShaking: true,
		format: "esm",
		target: "es2020",
		legalComments: "none",
		write: false,
		alias: { sury: join(sury, "packages/sury/index.mjs") },
		logLevel: "error",
		...(production && { conditions: ["production"] }),
		plugins: precompiled ? [precompile.esbuild({ cwd: here })] : []
	})
	const contents = outputFiles[0].contents
	const { p } = await import(
		`data:text/javascript;base64,${Buffer.from(contents).toString("base64")}`
	)
	if (typeof p === "function") {
		const valid = p(VALUE)
		if (!valid)
			throw new Error(`${code.slice(0, 40)} doesn't validate the suite's value`)
		// a check, returning true, must also return false
		if (valid === true && p({ ...VALUE, number: "1" }) !== false)
			throw new Error(`${code.slice(0, 40)} doesn't reject an invalid value`)
	}
	return {
		minified: contents.length,
		gzip: gzipSync(contents, { level: 9 }).byteLength
	}
}

const results: Record<
	string,
	Record<string, { minified: number; gzip: number }>
> = { suite: {}, production: {} }
for (const [build, production] of [
	["suite", false],
	["production", true]
] as const) {
	for (const [label, code] of Object.entries(entries))
		results[build][label] = await sizeOf(code, bench, production)
	results[build]["ArkType schema"] = await sizeOf(
		entries["ArkType (dynamic) schema"],
		here,
		production,
		"schema.ts"
	)
	results[build]["ArkType check"] = await sizeOf(
		"ArkType's .allows",
		here,
		production,
		"check.ts"
	)
}
writeFileSync(
	process.argv[2],
	`${JSON.stringify({ esbuild: version, ...results }, null, "\t")}\n`
)
console.log(JSON.stringify(results, null, 1))
