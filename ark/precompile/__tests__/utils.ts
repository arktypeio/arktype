import {
	precompileModule,
	Precompiler,
	renderDiagnostic,
	type ModuleAnalysis,
	type PrecompiledModule,
	type PrecompileHost,
	type PrecompileOptions
} from "@ark/precompile"
import { fromHere } from "@ark/fs"
import { hasArkKind } from "@ark/schema"
import { mkdirSync, writeFileSync } from "node:fs"
import { join, posix } from "node:path"

// a bare specifier resolves to a package in node_modules, which the build does not read
export const memoryHost = (files: Record<string, string>): PrecompileHost => ({
	resolve: (specifier, importer) =>
		specifier.startsWith(".") ?
			posix.join(posix.dirname(importer), specifier)
		:	`/node_modules/${specifier}/index.js`,
	readFile: path => files[path]
})

export const analyze = (
	source: string,
	files: Record<string, string> = {},
	opts?: PrecompileOptions
): ModuleAnalysis =>
	new Precompiler(memoryHost({ ...files, "/main.ts": source }), opts).analyze(
		source,
		"/main.ts"
	)

export const precompile = (
	source: string,
	files: Record<string, string> = {},
	opts?: PrecompileOptions
): PrecompiledModule =>
	precompileModule(
		source,
		"/main.ts",
		memoryHost({ ...files, "/main.ts": source }),
		opts
	)

// each site's status, with the expression of the value it folds to or the reasons it is rejected
export const statusesOf = (
	source: string,
	files?: Record<string, string>,
	opts?: PrecompileOptions
): string[] =>
	analyze(source, files, opts).sites.map(site =>
		[
			`${site.line}:${site.column} ${site.status}${
				site.parseError ? ` (${site.parseError.message})`
				: hasArkKind(site.value, "root") ? ` ${site.value.expression}`
				: ""
			}`,
			...site.reasons
		].join("\n  ")
	)

export const diagnosticsOf = (
	source: string,
	files?: Record<string, string>,
	opts?: PrecompileOptions
): string[] => analyze(source, files, opts).diagnostics.map(renderDiagnostic)

// each site's status, with the inputs a factory compares at creation or the reasons it is rejected
export const inputsOf = (
	source: string,
	files?: Record<string, string>
): string[][] =>
	analyze(source, files).sites.map(site => [
		`${site.line}:${site.column} ${site.status}`,
		...(site.status === "rejected" ?
			site.reasons
		:	site.inputs.map(
				input => `${input.kind} ${[input.name, ...input.path].join(".")}`
			))
	])

// a hash may follow `$ark`, the prefix of each name the precompiler imports, and an id is a quoted hash's first 8 characters
const hashPattern =
	/(?<![\da-z])(\$ark\$*)?(?=[\da-z]*\d)([\da-z]{12,}|(?<=")[\da-z]{8}(?="))(?![\da-z])/g

// content hashes change with the runtime's source, so snapshots number them by first appearance
export const normalized = <code extends string | string[]>(
	code: code
): code => {
	const indexByHash: Record<string, number> = {}
	const normalize = (s: string) =>
		s.replace(
			hashPattern,
			(_, prefix: string | undefined, hash: string) =>
				`${prefix ?? ""}#${(indexByHash[hash] ??= Object.keys(indexByHash).length)}`
		)
	return (
		typeof code === "string" ?
			normalize(code)
		:	code.map(normalize)) as never
}

// a program importing a package that opts in, which the tests write since git ignores node_modules
export const writeLibrary = (): string => {
	const root = fromHere("library")
	const tagged = join(root, "node_modules", "tagged")
	mkdirSync(tagged, { recursive: true })
	writeFileSync(
		join(tagged, "package.json"),
		JSON.stringify({
			name: "tagged",
			version: "1.0.0",
			type: "module",
			exports: "./index.js",
			arktype: { precompile: true }
		})
	)
	writeFileSync(
		join(tagged, "index.js"),
		'import { type } from "arktype"\n\nexport const Tagged = type({ tag: "string" })\n'
	)
	return root
}

// a program built without error detail, and in reads/ one importing a package that imports @ark/schema, which that build can't load
export const writeUndetailed = (): string => {
	const root = fromHere("temp", "undetailed")
	const reads = join(root, "node_modules", "reads")
	mkdirSync(reads, { recursive: true })
	mkdirSync(join(root, "reads"), { recursive: true })
	writeFileSync(
		join(root, "main.ts"),
		`import { type } from "arktype"

const T = type({ a: "string", b: "string.json.parse" })
const errors = T({ a: 1, b: "[" })
console.log(errors instanceof type.errors, String(errors))
console.log(JSON.stringify(T({ a: "a", b: "[1]" })))
try {
	T.assert({ a: 1 })
} catch (e) {
	console.log(String(e), (e as { cause?: unknown }).cause instanceof type.errors)
}
`
	)
	writeFileSync(
		join(root, "reads", "main.ts"),
		'import { reads } from "reads"\n\nconsole.log(reads)\n'
	)
	writeFileSync(
		join(reads, "package.json"),
		JSON.stringify({
			name: "reads",
			version: "1.0.0",
			type: "module",
			exports: "./index.js"
		})
	)
	writeFileSync(
		join(reads, "index.js"),
		'import { hasArkKind } from "@ark/schema"\n\nexport const reads = typeof hasArkKind\n'
	)
	writeFileSync(
		join(reads, "index.d.ts"),
		"export declare const reads: string\n"
	)
	return root
}

// what that program logs, its errors saying only that data is invalid
export const undetailedOutput = `true is invalid
{"a":"a","b":[1]}
Error: is invalid true
`
