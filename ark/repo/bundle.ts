import { buildSync } from "esbuild"
import { dirname, relative } from "node:path"
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
	const perModuleJs = walkPaths(fromCwd("out"), {
		include: path => path.endsWith(".js")
	}).sort()
	const entryPoints = publicEntryPoints()
	const ownFiles = flattenIntoMain(entryPoints, perModuleJs)
	// one build for all entries, so a module several import evaluates once
	const { outputFiles } = buildSync({
		entryPoints,
		outdir: fromCwd("out"),
		bundle: true,
		splitting: true,
		format: "esm",
		platform: "neutral",
		packages: "external",
		charset: "utf8",
		write: false,
		logLevel: "warning"
	})
	for (const path of perModuleJs) rmRf(path)
	for (const file of outputFiles)
		writeFile(file.path, nameSelfReferencingClasses(file.text))
	for (const [path, js] of Object.entries(ownFiles)) writeFile(path, js)
}

const publicEntryPoints = (): string[] =>
	Object.entries<string | { default: string }>(
		readPackageJson(process.cwd()).exports
	).flatMap(([subpath, target]) => {
		const file = typeof target === "string" ? target : target.default
		return (
				!subpath.includes("*") &&
					!subpath.startsWith("./internal/") &&
					file.endsWith(".js")
			) ?
				[fromCwd(file)]
			:	[]
	})

// deep imports resolve to main at runtime, so it exports every module's names
const flattenIntoMain = (
	entryPoints: string[],
	perModuleJs: string[]
): Record<string, string> => {
	const main = fromCwd("out", "index.js")
	const modules = perModuleJs.filter(path => !entryPoints.includes(path))
	const starring = (paths: string[]) =>
		paths.map(path => `export * from ${specifierOf(main, path)};\n`).join("")
	const { metafile, outputFiles } = buildSync({
		entryPoints: perModuleJs,
		stdin: {
			contents: starring([main, ...modules]),
			resolveDir: fromCwd("out")
		},
		outdir: fromCwd("out"),
		bundle: true,
		splitting: true,
		format: "esm",
		platform: "neutral",
		packages: "external",
		write: false,
		metafile: true,
		absWorkingDir: process.cwd(),
		logLevel: "warning"
	})
	const outputs = Object.entries(metafile.outputs)
	const namesByPath = Object.fromEntries(
		outputs.flatMap(([, { entryPoint, exports }]) =>
			entryPoint ? [[fromCwd(entryPoint), exports]] : []
		)
	)
	const [stdinOutputPath] = outputs.find(
		([, { entryPoint }]) => entryPoint === "<stdin>"
	)!
	const unambiguousNames = exportedBy(
		outputFiles.find(file => file.path === fromCwd(stdinOutputPath))!.text
	)
	// starring a module without names would evaluate it
	let mainJs =
		readFile(main) + starring(modules.filter(path => namesByPath[path].length))
	const ownFiles: Record<string, string> = {}
	for (const name of new Set(perModuleJs.flatMap(path => namesByPath[path]))) {
		if (unambiguousNames.has(name)) continue
		const exporting = perModuleJs.filter(path =>
			namesByPath[path].includes(name)
		)
		if (name === "default") {
			throw new Error(
				`The main entry can't export default for ${exporting.map(moduleOf).join(", ")}, which must export it by name`
			)
		}
		const [first, ...others] = exporting.filter(path => path !== main)
		if (exporting.includes(main)) {
			throw new Error(
				`The main entry exports ${name}, which one of ${[first, ...others].map(moduleOf).join(", ")} binds otherwise (to esbuild, re-exporting another package's name binds it anew)`
			)
		}
		mainJs += reexporting([name], main, first)
		for (const path of others) {
			const alias = `${name}$${moduleOf(path).replace(/[^\w$]/g, "$")}`
			mainJs += reexporting([`${name} as ${alias}`], main, path)
			assertMapsToOwnFile(path)
			if (entryPoints.includes(path)) continue
			ownFiles[path] ??= `export * from ${specifierOf(path, main)};\n`
			ownFiles[path] += reexporting([`${alias} as ${name}`], path, main)
		}
	}
	writeFile(main, mainJs)
	return ownFiles
}

const moduleOf = (path: string) =>
	relative(fromCwd("out"), path).replace(/\\/g, "/").replace(/\.js$/, "")

// the metafile lists ambiguous exports too, so read the names from the JS
const exportedBy = (js: string) =>
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
	const file = `./${relative(process.cwd(), path).replace(/\\/g, "/")}`
	const module = file.slice("./out/".length, -".js".length)
	for (const subpath of [
		`./internal/${module}.ts`,
		`./internal/${module}.js`
	]) {
		if (exports[subpath]?.default !== file) {
			throw new Error(
				`${module} exports a name the main entry binds otherwise, so ${subpath} must be { "ark-ts": "./${module}.ts", "types": "./out/${module}.d.ts", "default": "${file}" } in package.json's exports`
			)
		}
	}
}

const reexporting = (specifiers: string[], from: string, path: string) =>
	`export { ${specifiers.join(", ")} } from ${specifierOf(from, path)};\n`

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
			if (name && name !== node.name.text) {
				const renames = renamesTo(node, name)
				if (!renames)
					throw new Error(`Can't rename class ${node.name.text} to ${name}`)
				edits.push(...renames)
			}
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

const renamesTo = (
	node: ts.ClassExpression,
	name: string
): Edit[] | undefined => {
	const innerName = node.name!.text
	const renames: Edit[] = [[node.name!.getStart(), node.name!.getEnd(), name]]
	let isRenamable = true
	const visit = (child: ts.Node): void => {
		if (ts.isIdentifier(child)) {
			const parent = child.parent as { name?: ts.Node; propertyName?: ts.Node }
			if (child.text === name) isRenamable = false
			else if (child.text === innerName) {
				if (parent.name === child || parent.propertyName === child)
					isRenamable = false
				else renames.push([child.getStart(), child.getEnd(), name])
			}
		}
		ts.forEachChild(child, visit)
	}
	ts.forEachChild(node, child => {
		if (child !== node.name) visit(child)
	})
	return isRenamable ? renames : undefined
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
