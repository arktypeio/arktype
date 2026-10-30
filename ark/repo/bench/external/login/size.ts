// valibot.dev's login form as written, with its messages, bundled as
// bundlejs.com does (esbuild: esm, minify, tree shaking, browser) and
// gzipped. Each arktype build precompiles arktype.ts with @ark/aot in a
// production build (esbuild's "production" condition), b2 also in development.
// ajv, which has no custom messages, is its standalone code for the same
// constraints. ESBUILD picks the esbuild to import (default: this package's)
// node login/size.ts <out.json>
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { Ajv } from "ajv"
import addFormats from "ajv-formats"
import standaloneCode from "ajv/dist/standalone/index.js"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

const { build }: typeof import("esbuild") = await import(
	process.env.ESBUILD ?? "esbuild"
)

const here = import.meta.dirname

const builds: [string, PrecompileUnpluginOptions | undefined, boolean][] = [
	["arktype b1", {}, true],
	["arktype b2", { preset: "smallest" }, true],
	["arktype b2 (development)", { preset: "smallest" }, false],
	["arktype b1 (optimizeErrors size)", { optimizeErrors: "size" }, true],
	["arktype dynamic", undefined, true]
]

const ajv = new Ajv({ unicode: false, code: { source: true, esm: true } })
addFormats.default(ajv, { formats: ["email"] })
const ajvCode = `${standaloneCode.default(
	ajv,
	ajv.compile({
		type: "object",
		properties: {
			email: { type: "string", minLength: 1, format: "email" },
			password: { type: "string", minLength: 8 }
		},
		required: ["email", "password"]
	})
)}\nvalidate({})`

const sizeOf = async (
	entry: { file: string } | { code: string },
	options?: PrecompileUnpluginOptions,
	production = true
) => {
	const { outputFiles } = await build({
		...("file" in entry ?
			{ entryPoints: [join(here, entry.file)] }
		:	{ stdin: { contents: entry.code, resolveDir: here } }),
		absWorkingDir: here,
		bundle: true,
		minify: true,
		treeShaking: true,
		format: "esm",
		platform: "browser",
		target: "esnext",
		conditions: production ? ["production"] : [],
		write: false,
		logLevel: "error",
		plugins: options ? [precompile.esbuild({ cwd: here, ...options })] : []
	})
	const code = outputFiles[0].text
	return {
		min: Buffer.byteLength(code),
		gzip: gzipSync(code, { level: 9 }).length
	}
}

const sizes: Record<string, { min: number; gzip: number }> = {}
for (const [name, options, production] of builds)
	sizes[name] = await sizeOf({ file: "arktype.ts" }, options, production)
for (const name of ["valibot", "zodMini", "zod"])
	sizes[name] = await sizeOf({ file: `${name}.ts` })
sizes["ajv standalone (first error, no messages)"] = await sizeOf({
	code: ajvCode
})

console.table(sizes)
writeFileSync(process.argv[2], JSON.stringify(sizes, null, 1))
