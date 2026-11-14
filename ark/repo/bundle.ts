import { buildSync, type BuildOptions } from "esbuild"
import { join, relative } from "node:path"
import { ts } from "ts-morph"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	readPackageJson,
	rmRf,
	walkPaths,
	writeFile
} from "../fs/index.ts"
import { packagesByScope, repoDirs } from "./shared.ts"

export const bundle = (): void => {
	const modulePaths = walkPaths(fromCwd("out"), {
		include: path => path.endsWith(".js")
	})
	const entryPoints = publicEntryPoints(process.cwd())
	// a runtime bundled with an issues module of its own, by that module
	const variants = [
		[fromCwd("out", "runtimeNone.js"), "./issuesNone.js"],
		[fromCwd("out", "runtimeLean.js"), "./issuesLean.js"],
		[fromCwd("out", "runtimeNoneLean.js"), "./issuesNoneLean.js"]
	].filter(([runtime]) => entryPoints.includes(runtime))
	const opts = {
		bundle: true,
		format: "esm",
		platform: "neutral",
		packages: "external",
		charset: "utf8",
		absWorkingDir: process.cwd(),
		write: false,
		logLevel: "warning",
		external: [issueFeaturesPath()]
	} satisfies BuildOptions
	// a module several entries import evaluates once only if they share one build
	const { outputFiles, metafile } = buildSync({
		...opts,
		metafile: true,
		entryPoints: entryPoints.filter(
			path =>
				path !== issueFeaturesPath() &&
				!variants.some(([runtime]) => runtime === path)
		),
		outdir: fromCwd("out"),
		splitting: true
	})
	// each bundled once issues.js re-exports its issues module
	for (const [runtime, issues] of variants) {
		writeFile(
			fromCwd("out", "shared", "issues.js"),
			`export * from ${JSON.stringify(issues)}\n`
		)
		const variant = buildSync({
			...opts,
			entryPoints: [runtime],
			outfile: runtime,
			metafile: true
		})
		outputFiles.push(...variant.outputFiles)
		Object.assign(metafile.outputs, variant.metafile.outputs)
	}
	const kept = [...developmentEntryPoints(process.cwd()), issueFeaturesPath()]
	for (const path of modulePaths) if (!kept.includes(path)) rmRf(path)
	const loaded = precompiledSources()
	for (const file of outputFiles) {
		const js = nameSelfReferencingClasses(
			reexportImports(importingIssueFeatures(file.text))
		)
		const inputs = Object.keys(
			metafile.outputs[relative(process.cwd(), file.path)]?.inputs ?? {}
		)
		writeFile(
			file.path,
			inputs.some(input => loaded.has(sourceOf(input))) ? js : parsedLazily(js)
		)
	}
}

// the sources a precompiled program loads, through any package's runtime
// entries, which keep their bytes as they're written
const precompiledSources = (): Set<string> => {
	const entries = Object.values(packagesByScope).flatMap(({ path, json }) =>
		Object.entries(
			json.exports as Record<string, { "ark-ts"?: unknown }>
		).flatMap(([subpath, target]) => {
			const source = target["ark-ts"] as string | { default: string }
			return subpath.startsWith("./runtime") ?
					[join(path, typeof source === "string" ? source : source.default)]
				:	[]
		})
	)
	const { metafile } = buildSync({
		entryPoints: entries,
		bundle: true,
		format: "esm",
		platform: "neutral",
		conditions: ["ark-ts"],
		absWorkingDir: repoDirs.root,
		outdir: "out",
		write: false,
		metafile: true,
		logLevel: "error"
	})
	return new Set(
		Object.keys(metafile.inputs).map(input => join(repoDirs.root, input))
	)
}

// the source tsc wrote an input of the bundle from
const sourceOf = (input: string) =>
	join(process.cwd(), input.replace(/^out\//, "").replace(/\.js$/, ".ts"))

// what a program's issues may hold, an entry every chunk reading it shares,
// kept as tsc writes it, so a bundler inlines its constants and a build
// reading each validator writes it again
const issueFeaturesPath = () => fromCwd("out", "shared", "issueFeatures.js")

// as shared/issues.js imports it, from beside shared/, as every entry and
// chunk is written
const importingIssueFeatures = (js: string) =>
	js.split('"./issueFeatures.js"').join('"./shared/issueFeatures.js"')

// esbuild splits an entry listed twice into a chunk
export const publicEntryPoints = (dir: string): string[] => [
	...new Set(
		Object.entries<string | { default: string }>(
			readPackageJson(dir).exports
		).flatMap(([subpath, target]) => {
			const file = typeof target === "string" ? target : target.default
			return !subpath.includes("*") && file.endsWith(".js") ?
					[join(dir, file)]
				:	[]
		})
	)
]

// each imports the entry it wraps, so it ships as tsc wrote it
const developmentEntryPoints = (dir: string): string[] =>
	Object.values<string | { development?: string }>(
		readPackageJson(dir).exports
	).flatMap(target =>
		typeof target === "object" && target.development ?
			[join(dir, target.development)]
		:	[]
	)

type Edit = [start: number, end: number, replacement: string]

const applyEdits = (js: string, edits: Edit[]) =>
	edits
		.sort(([l], [r]) => r - l)
		.reduce(
			(result, [start, end, replacement]) =>
				result.slice(0, start) + replacement + result.slice(end),
			js
		)

const parse = (js: string) =>
	ts.createSourceFile(
		"bundle.js",
		js,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS
	)

// esbuild writes a re-export, like `export { x } from "pkg"` or an entry's of
// a chunk's export, as an import its export list reads, which Rollup warns
// is never used, where the package is external, wherever a bundle reads none
// of those exports. So each is written as a re-export again, and a name
// nothing reads is dropped
const reexportImports = (js: string): string => {
	const file = parse(js)
	// each name read other than to import or export it
	const read = new Set<string>()
	const exportLists: ts.ExportDeclaration[] = []
	const visit = (node: ts.Node): void => {
		if (
			ts.isIdentifier(node) &&
			!ts.isImportSpecifier(node.parent) &&
			!ts.isExportSpecifier(node.parent)
		)
			read.add(node.text)
		if (
			ts.isExportDeclaration(node) &&
			!node.moduleSpecifier &&
			node.exportClause &&
			ts.isNamedExports(node.exportClause)
		)
			exportLists.push(node)
		ts.forEachChild(node, visit)
	}
	visit(file)
	const reexported = new Set<ts.ExportSpecifier>()
	const edits: Edit[] = []
	for (const statement of file.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!statement.importClause ||
			statement.importClause.name ||
			!statement.importClause.namedBindings ||
			!ts.isNamedImports(statement.importClause.namedBindings)
		)
			continue
		const kept: string[] = []
		const forwarded: string[] = []
		for (const specifier of statement.importClause.namedBindings.elements) {
			const local = specifier.name.text
			if (read.has(local)) {
				kept.push(specifier.getText())
				continue
			}
			const imported = (specifier.propertyName ?? specifier.name).getText()
			for (const list of exportLists) {
				for (const exported of (list.exportClause as ts.NamedExports)
					.elements) {
					if ((exported.propertyName ?? exported.name).getText() !== local)
						continue
					reexported.add(exported)
					const name = exported.name.getText()
					forwarded.push(name === imported ? name : `${imported} as ${name}`)
				}
			}
		}
		if (kept.length === statement.importClause.namedBindings.elements.length)
			continue
		const from = statement.moduleSpecifier.getText()
		const written = [
			kept.length ? `import { ${kept.join(", ")} } from ${from};`
			: forwarded.length ? ""
			: `import ${from};`,
			forwarded.length ? `export { ${forwarded.join(", ")} } from ${from};` : ""
		]
		edits.push([
			statement.getStart(),
			statement.getEnd(),
			written.filter(Boolean).join("\n")
		])
	}
	for (const list of exportLists) {
		const elements = (list.exportClause as ts.NamedExports).elements
		const kept = elements.filter(element => !reexported.has(element))
		if (kept.length === elements.length) continue
		edits.push(
			kept.length ?
				[
					list.getStart(),
					list.getEnd(),
					`export {\n${kept.map(element => `  ${element.getText()}`).join(",\n")}\n};`
				]
			:	[
					list.getStart(),
					js[list.getEnd()] === "\n" ? list.getEnd() + 1 : list.getEnd(),
					""
				]
		)
	}
	return applyEdits(js, edits)
}

// V8 parses an arrow function in full where its module is compiled, but only
// preparses a function expression until it's called, so the arrows a module
// defines outside any function are written as functions unless they read what
// an arrow reads from its scope. Most of the library is never called by a
// given program, and parsing it was most of what importing arktype cost: this
// took an empty program's import from 88.8M instructions to 84.7M. A body
// shorter than this parses in about the time its `function` and `return` cost
// in bytes: converting every arrow saved no more and added 12.4 KB minified
const lazilyParsedLength = 120

const parsedLazily = (js: string): string => {
	const edits: Edit[] = []
	const visit = (node: ts.Node): void => {
		if (ts.isArrowFunction(node)) {
			if (
				node.body.getEnd() - node.body.getStart() >= lazilyParsedLength &&
				!readsScope(node)
			)
				edits.push(...asFunction(js, node))
			return
		}
		// what's inside a function is preparsed with it
		if (!ts.isFunctionLike(node) && !ts.isClassLike(node))
			ts.forEachChild(node, visit)
	}
	visit(parse(js))
	return applyEdits(js, edits)
}

// whether it reads this, arguments, super or new.target, which a function
// would bind itself, or holds a class, which could
const readsScope = (arrow: ts.ArrowFunction): boolean => {
	const visit = (node: ts.Node): boolean =>
		node.kind === ts.SyntaxKind.ThisKeyword ||
		node.kind === ts.SyntaxKind.SuperKeyword ||
		ts.isMetaProperty(node) ||
		ts.isClassLike(node) ||
		(ts.isIdentifier(node) && node.text === "arguments") ||
		((!ts.isFunctionLike(node) || ts.isArrowFunction(node)) &&
			!!ts.forEachChild(node, visit))
	return !!ts.forEachChild(arrow, visit)
}

const asFunction = (js: string, arrow: ts.ArrowFunction): Edit[] => {
	const isAsync = arrow.modifiers?.some(
		modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword
	)
	const start = isAsync ? arrow.modifiers![0].getEnd() : arrow.getStart()
	const head = js.slice(start, arrow.equalsGreaterThanToken.getStart()).trim()
	const edits: Edit[] = [
		[
			start,
			arrow.equalsGreaterThanToken.getEnd(),
			`${isAsync || /[\w$]/.test(js[start - 1]) ? " " : ""}function ${head[0] === "(" ? head : `(${head})`}`
		]
	]
	if (!ts.isBlock(arrow.body)) {
		edits.push(
			[arrow.body.getStart(), arrow.body.getStart(), "{ return "],
			[arrow.body.getEnd(), arrow.body.getEnd(), " }"]
		)
	}
	return edits
}

// esbuild names a self-referencing class _X, as in `var X = class _X {...}`
const nameSelfReferencingClasses = (js: string): string => {
	const edits: Edit[] = []
	const identifiers = new Set<string>()
	const runtimeNames: string[] = []
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node)) identifiers.add(node.text)
		const runtimeName = runtimeNameOf(node)
		if (runtimeName) runtimeNames.push(runtimeName)
		if (ts.isClassExpression(node) && node.name) {
			const name = inferredNameOf(node)
			if (name && name !== node.name.text) edits.push(...renamesTo(node, name))
		}
		ts.forEachChild(node, visit)
	}
	visit(parse(js))
	for (const name of runtimeNames) {
		const collided = collidedNameOf(name, identifiers)
		if (collided) {
			throw new Error(
				`esbuild renamed ${collided} to ${name}, which changes its runtime name, so rename it or the ${collided} it collides with`
			)
		}
	}
	return applyEdits(js, edits)
}

// esbuild renames any binding of X inside class _X, e.g. to X2
const renamesTo = (node: ts.ClassExpression, name: string): Edit[] => {
	const innerName = node.name!.text
	const renames: Edit[] = [[node.name!.getStart(), node.name!.getEnd(), name]]
	const visit = (child: ts.Node): void => {
		if (ts.isIdentifier(child)) {
			const parent = child.parent as { name?: ts.Node; propertyName?: ts.Node }
			const isShorthand = ts.isShorthandPropertyAssignment(child.parent)
			const isReference =
				isShorthand || (parent.name !== child && parent.propertyName !== child)
			// only a class the source named itself refers to X or { _X } here
			if (
				isReference &&
				(child.text === name || (isShorthand && child.text === innerName))
			)
				throw new Error(`Can't rename class ${innerName} to ${name}`)
			if (isReference && child.text === innerName)
				renames.push([child.getStart(), child.getEnd(), name])
		}
		ts.forEachChild(child, visit)
	}
	ts.forEachChild(node, child => {
		if (child !== node.name) visit(child)
	})
	return renames
}

const inferredNameOf = (node: ts.Node): string | undefined =>
	(
		ts.isVariableDeclaration(node.parent) &&
		node.parent.initializer === node &&
		ts.isIdentifier(node.parent.name)
	) ?
		node.parent.name.text
	:	undefined

const runtimeNameOf = (node: ts.Node): string | undefined =>
	ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) ?
		node.name?.text
	: ts.isClassExpression(node) ? (inferredNameOf(node) ?? node.name?.text)
	: ts.isFunctionExpression(node) ? (node.name?.text ?? inferredNameOf(node))
	: ts.isArrowFunction(node) ? inferredNameOf(node)
	: undefined

const collidedNameOf = (name: string, identifiers: Set<string>) => {
	for (let end = name.length - 1; /\d/.test(name[end]); end--)
		if (identifiers.has(name.slice(0, end))) return name.slice(0, end)
}
