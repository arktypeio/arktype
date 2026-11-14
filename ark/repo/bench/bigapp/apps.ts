import standaloneCode from "ajv/dist/standalone/index.js"
import { _ } from "ajv/dist/compile/codegen/index.js"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { ajvOf } from "../libraries.ts"

// the benchBuildTime generator's apps, for every library, optionally with
// narrows: a narrow makes every node above it per-Type, which hole-free apps
// can't show. Timestamp, in most objects, and Slug get one each per domain.

export type Library = "arktype" | "zod" | "valibot"

const bench = join(import.meta.dirname, "..")

const sources: Record<Library, string> = {
	arktype: join(bench, "apps", "saas", "arktype"),
	valibot: join(bench, "apps", "saas", "valibot"),
	zod: join(import.meta.dirname, "saas-zod")
}

const saasModules = [
	"common",
	"accounts",
	"projects",
	"issues",
	"billing",
	"events",
	"ops"
]

export interface Size {
	domains: number
	modules: string[]
}

// by Type count. 11, 92 and 1012 are benchBuildTime's apps
export const sizes: Record<number, Size> = {
	11: { domains: 1, modules: ["common", "projects"] },
	46: { domains: 1, modules: saasModules },
	92: { domains: 2, modules: saasModules },
	230: { domains: 5, modules: saasModules },
	460: { domains: 10, modules: saasModules },
	1012: { domains: 22, modules: saasModules },
	2024: { domains: 44, modules: saasModules }
}

// each domain's upper bounds are offset by its index, so no two share a Type
const bound: Record<Library, RegExp> = {
	arktype: /(<=\s*)(\d+)/g,
	valibot: /(v\.max(?:Length|Value)\()(\d+)/g,
	zod: /(\.max\()(\d+)/g
}

const narrowed: Record<Library, (source: string, domain: number) => string> = {
	arktype: (source, domain) =>
		source
			.replace(
				'type("string.date.iso")',
				`type("string.date.iso").narrow(s => s.length !== ${domain + 100})`
			)
			.replace(
				/(\.and\("2 <= string <= \d+"\))/,
				`$1.narrow(s => !s.endsWith("-${domain}x"))`
			),
	valibot: (source, domain) =>
		source
			.replace(
				"v.isoTimestamp())",
				`v.isoTimestamp(), v.check(s => s.length !== ${domain + 100}))`
			)
			.replace(
				/(v\.maxLength\(\d+\))\n\)/,
				`$1,\n\tv.check(s => !s.endsWith("-${domain}x"))\n)`
			),
	zod: (source, domain) =>
		source
			.replace(
				"z.iso.datetime()",
				`z.iso.datetime().refine(s => s.length !== ${domain + 100})`
			)
			.replace(
				/(\.max\(\d+\))\n\nexport const Page/,
				`$1\n\t.refine(s => !s.endsWith("-${domain}x"))\n\nexport const Page`
			)
}

const handler: Record<Library, string> = {
	arktype: `const out = %(body)\n\treturn out instanceof type.errors ? { issues: out.issues } : { data: out }`,
	valibot: `const out = v.safeParse(%, body)\n\treturn out.success ? { data: out.output } : { issues: out.issues }`,
	zod: `const out = %.safeParse(body)\n\treturn out.success ? { data: out.data } : { issues: out.error.issues }`
}

const importOf: Record<Library, string> = {
	arktype: `import { type } from "arktype"`,
	valibot: `import * as v from "valibot"`,
	zod: ""
}

const definition = /^(?:export )?const (\w+) =/gm
const exported = /^export const (\w+) =/gm

/** writes the app, returning its entry */
export const writeApp = (
	types: number,
	library: Library,
	narrows: boolean,
	dir: string
): string => {
	const { domains, modules } = sizes[types]
	rmSync(dir, { recursive: true, force: true })
	const write = (path: string, contents: string) => {
		mkdirSync(dirname(join(dir, path)), { recursive: true })
		writeFileSync(join(dir, path), contents)
	}
	let counted = 0
	const lines: string[] = []
	for (let i = 0; i < domains; i++) {
		const handlers = [importOf[library]]
		const names: string[] = []
		for (const name of modules) {
			let source = readFileSync(join(sources[library], `${name}.ts`), "utf8")
			if (i > 0) {
				source = source.replace(
					bound[library],
					(_, op, n) => `${op}${Number(n) + i}`
				)
			}
			if (narrows && name === "common") source = narrowed[library](source, i)
			counted += [...source.matchAll(definition)].length
			const declared = [...source.matchAll(exported)].map(m => m[1])
			names.push(...declared)
			handlers.push(`import { ${declared.join(", ")} } from "./${name}.ts"`)
			write(`d${i}/${name}.ts`, source)
		}
		for (const name of names) {
			handlers.push(
				`export const check${name} = (body: unknown) => {\n\t${handler[library].replace(/%/g, name)}\n}`
			)
		}
		write(`d${i}/handlers.ts`, handlers.join("\n"))
		lines.push(
			i === 0 ?
				`export * from "./d0/handlers.ts"`
			:	`export * as d${i} from "./d${i}/handlers.ts"`
		)
	}
	// the rivals' ports declare a few more, which they can't inline
	if (library === "arktype" && counted !== types)
		throw new Error(`${types} Type app has ${counted} definitions`)
	write("index.ts", lines.join("\n"))
	return join(dir, "index.ts")
}

// a hand port of 46 Types to JSON Schema isn't cheap, so ajv validates what
// arktype's own schemas convert to, without what a person wouldn't write:
// descriptions, and patterns beside the formats that imply them. No narrows,
// which JSON Schema can't express
const handWritten = (schema: unknown): unknown => {
	if (Array.isArray(schema)) return schema.map(handWritten)
	if (typeof schema !== "object" || schema === null) return schema
	const { description, $schema, ...rest } = schema as Record<string, unknown>
	if (rest.format) delete rest.pattern
	return Object.fromEntries(
		Object.entries(rest).map(([k, v]) => [k, handWritten(v)])
	)
}

/** writes ajv's standalone code for the arktype app in dir, returning its entry */
export const writeAjvApp = async (types: number, dir: string) => {
	writeApp(types, "arktype", false, dir)
	const { domains, modules } = sizes[types]
	const schemas: object[] = []
	const handlers: string[] = []
	for (let i = 0; i < domains; i++) {
		const checks: string[] = []
		for (const name of modules) {
			const module = await import(join(dir, `d${i}`, `${name}.ts`))
			for (const [key, value] of Object.entries<any>(module)) {
				if (typeof value?.toJsonSchema !== "function") continue
				const id = `d${i}_${key}`
				schemas.push({
					...(handWritten(value.toJsonSchema()) as object),
					$id: id
				})
				checks.push(
					`check${key}: body => ${id}(body) ? { data: body } : { issues: ${id}.errors }`
				)
			}
		}
		handlers.push(
			i === 0 ?
				checks
					.map(check => `export const ${check.replace(":", " =")}`)
					.join("\n")
			:	`export const d${i} = { ${checks.join(", ")} }`
		)
	}
	const ajv = ajvOf({
		strict: false,
		schemas,
		code: {
			source: true,
			esm: true,
			formats: _`require("ajv-formats/dist/formats").fullFormats`
		}
	})
	const ids = schemas.map(schema => (schema as { $id: string }).$id)
	const entry = join(dir, "ajv.js")
	writeFileSync(
		entry,
		[
			standaloneCode.default(ajv, Object.fromEntries(ids.map(id => [id, id]))),
			...handlers
		].join("\n")
	)
	return entry
}
