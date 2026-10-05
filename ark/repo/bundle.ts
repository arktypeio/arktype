import { flatMorph } from "@ark/util"
import { buildSync } from "esbuild"
import { dirname, join, relative } from "node:path"
import ts from "typescript"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	readFile,
	readPackageJson,
	rmRf,
	walkPaths,
	writeFile
} from "../fs/index.ts"

export const bundle = (): void => {
	// sorted so every build gives an ambiguous name to the same module
	const modulePaths = walkPaths(fromCwd("out"), {
		include: path => path.endsWith(".js")
	}).sort()
	const entryPoints = publicEntryPoints(process.cwd())
	const ownFiles = flattenIntoInternal(entryPoints, modulePaths)
	// one build for every entry evaluates a module they share once
	const { outputFiles } = buildSync({ ...buildOptions(), entryPoints })
	for (const path of modulePaths) rmRf(path)
	for (const file of outputFiles)
		writeFile(file.path, nameSelfReferencingClasses(file.text))
	for (const [path, js] of Object.entries(ownFiles)) writeFile(path, js)
}

const buildOptions = () =>
	({
		outdir: fromCwd("out"),
		bundle: true,
		splitting: true,
		format: "esm",
		platform: "neutral",
		packages: "external",
		charset: "utf8",
		absWorkingDir: process.cwd(),
		write: false,
		logLevel: "warning"
	}) as const

export const publicEntryPoints = (dir: string): string[] =>
	Object.entries<string | { default: string }>(
		readPackageJson(dir).exports
	).flatMap(([subpath, target]) => {
		const file = typeof target === "string" ? target : target.default
		return (
				!subpath.includes("*") &&
					!subpath.startsWith("./internal/") &&
					file.endsWith(".js")
			) ?
				[join(dir, file)]
			:	[]
	})

// every deep import resolves to internal.js at runtime
const flattenIntoInternal = (
	entryPoints: string[],
	modulePaths: string[]
): Record<string, string> => {
	const main = fromCwd("out", "index.js")
	const internal = fromCwd("out", "internal.js")
	const writeStarExports = (paths: string[]) =>
		paths
			.map(path => `export * from ${specifierOf(internal, path)};\n`)
			.join("")
	const { metafile, outputFiles } = buildSync({
		...buildOptions(),
		entryPoints: modulePaths,
		stdin: {
			contents: writeStarExports([
				main,
				...modulePaths.filter(path => !entryPoints.includes(path))
			]),
			resolveDir: fromCwd("out")
		},
		metafile: true
	})
	const namesByPath = flatMorph(
		metafile.outputs,
		(_, { entryPoint, exports }) =>
			entryPoint ? [fromCwd(entryPoint), exports] : []
	)
	const stdinOutputPath = Object.keys(metafile.outputs).find(
		path => metafile.outputs[path].entryPoint === "<stdin>"
	)!
	const unambiguousNames = exportedNamesOf(
		outputFiles.find(file => file.path === fromCwd(stdinOutputPath))!.text
	)
	// main exports module names under aliases no consumer's `export *` can clash with
	let mainJs = readFile(main)
	let internalJs = writeStarExports([main])
	const ownFiles: Record<string, string> = {}
	for (const name of new Set(modulePaths.flatMap(path => namesByPath[path]))) {
		const isUnambiguous = unambiguousNames.has(name)
		if (isUnambiguous && namesByPath[main].includes(name)) continue
		const exportingPaths = modulePaths.filter(path =>
			namesByPath[path].includes(name)
		)
		if (name === "default") {
			throw new Error(
				`internal.js can't export default for ${exportingPaths.map(moduleOf).join(", ")}, which must export it by name`
			)
		}
		const [first, ...others] = exportingPaths.filter(path => path !== main)
		if (exportingPaths.includes(main)) {
			throw new Error(
				`The main entry exports ${name}, which one of ${[first, ...others].map(moduleOf).join(", ")} binds otherwise (to esbuild, re-exporting another package's name binds it anew)`
			)
		}
		const aliasOf = (path: string) =>
			`${name}$${moduleOf(path).replace(/[^\w$]/g, "$")}`
		mainJs += writeReexport(`${name} as ${aliasOf(first)}`, main, first)
		internalJs += writeReexport(`${aliasOf(first)} as ${name}`, internal, main)
		if (isUnambiguous) continue
		for (const path of others) {
			mainJs += writeReexport(`${name} as ${aliasOf(path)}`, main, path)
			assertMapsToOwnFile(path)
			if (entryPoints.includes(path)) continue
			ownFiles[path] ??= `export * from ${specifierOf(path, internal)};\n`
			ownFiles[path] += writeReexport(
				`${aliasOf(path)} as ${name}`,
				path,
				internal
			)
		}
	}
	writeFile(main, mainJs)
	ownFiles[internal] = internalJs
	return ownFiles
}

const moduleOf = (path: string) =>
	relative(fromCwd("out"), path).replace(/\\/g, "/").replace(/\.js$/, "")

// unlike the metafile, the JS omits ambiguous exports
const exportedNamesOf = (js: string) =>
	new Set(
		parse(js).statements.flatMap(statement =>
			(
				ts.isExportDeclaration(statement) &&
				statement.exportClause &&
				ts.isNamedExports(statement.exportClause)
			) ?
				statement.exportClause.elements.map(({ name }) => name.text)
			:	[]
		)
	)

const assertMapsToOwnFile = (path: string) => {
	const exports = readPackageJson(process.cwd()).exports
	const module = moduleOf(path)
	const file = `./out/${module}.js`
	for (const subpath of [
		`./internal/${module}.ts`,
		`./internal/${module}.js`
	]) {
		if (exports[subpath]?.default !== file) {
			throw new Error(
				`${module} exports a name internal.js binds otherwise, so ${subpath} must be { "ark-ts": "./${module}.ts", "default": "${file}" } in package.json's exports`
			)
		}
	}
}

const writeReexport = (clause: string, from: string, to: string) =>
	`export { ${clause} } from ${specifierOf(from, to)};\n`

const specifierOf = (from: string, to: string) => {
	const path = relative(dirname(from), to).replace(/\\/g, "/")
	return JSON.stringify(path.startsWith(".") ? path : `./${path}`)
}

type Edit = [start: number, end: number, replacement: string]

const parse = (js: string) =>
	ts.createSourceFile(
		"bundle.js",
		js,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS
	)

const applyEdits = (js: string, edits: Edit[]) =>
	edits
		.sort(([l], [r]) => r - l)
		.reduce(
			(result, [start, end, replacement]) =>
				result.slice(0, start) + replacement + result.slice(end),
			js
		)

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
