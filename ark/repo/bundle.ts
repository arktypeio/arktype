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

/**
 * Replaces the JS tsc wrote to out/, one file per module, with an ESM bundle
 * of the package, so importing it loads a few files instead.
 *
 * Every export without a * outside "./internal/" (".", "./config") is an
 * entry of one build, so a module more than one of them imports, like the one
 * that installs the registry, is evaluated once whichever is imported first.
 * Other packages stay imports, each resolving to its own bundle.
 *
 * out/ keeps a .d.ts per module, which "./internal/*" resolves to for types.
 * At runtime it resolves to the main entry, so a deep import shares its
 * modules instead of evaluating copies of them, and the main entry exports
 * every name any module exports, whether or not its .d.ts declares it. A name
 * two modules bind apart it exports as the first binds it, and under an alias
 * as each other does, and each other module gets a file of its own that
 * exports the main entry's names and the alias under the name, which
 * package.json must map the module's deep imports to. No module may bind a
 * name the main entry binds otherwise, nor export "default".
 * "./internal/config.ts" (and .js) resolves to the config entry, so
 * configuring through it still runs before the rest of the package evaluates,
 * as keyword config must.
 */
export const bundle = (): void => {
	// sorted, so which of two modules' like-named exports the main entry
	// exports under that name is the same wherever it's built
	const perModuleJs = walkPaths(fromCwd("out"), {
		include: path => path.endsWith(".js")
	}).sort()
	const entryPoints = publicEntryPoints()
	const ownFiles = flattenInto(entryPoints, perModuleJs)
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
	for (const [path, js] of ownFiles) writeFile(path, js)
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

/**
 * Appends to main's JS an `export *` of each module but the entries that
 * exports a name, so main exports every name they bind alike, as ES modules
 * link them, and evaluates any module it didn't after those it did, before its
 * own code. A name modules bind apart, being ambiguous there, main exports
 * from the first module exporting it, and from each other under an alias,
 * which that module's own file exports under the name. Returns the JS of each
 * such file. To esbuild, modules re-exporting another package's name bind it
 * apart.
 */
const flattenInto = (
	entryPoints: string[],
	perModuleJs: string[]
): Map<string, string> => {
	const main = fromCwd("out", "index.js")
	const modules = perModuleJs.filter(path => !entryPoints.includes(path))
	const starring = (paths: string[]) =>
		paths.map(path => `export * from ${specifierOf(main, path)};\n`).join("")
	// each module's names, and the names main and every module bind alike,
	// which a module star-exporting all of them exports
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
		// what the metafile's paths are relative to
		absWorkingDir: process.cwd(),
		logLevel: "warning"
	})
	const outputs = Object.entries(metafile.outputs)
	const namesOf = new Map(
		outputs.flatMap(([, { entryPoint, exports }]) =>
			entryPoint ? [[fromCwd(entryPoint), exports]] : []
		)
	)
	const [starredAll] = outputs.find(
		([, { entryPoint }]) => entryPoint === "<stdin>"
	)!
	const alike = exportedBy(
		outputFiles.find(file => file.path === fromCwd(starredAll))!.text
	)
	// starring a module without names would evaluate it, and starring an entry
	// would move modules between the entries' chunks
	let js =
		readFile(main) + starring(modules.filter(path => namesOf.get(path)!.length))
	const ownFiles = new Map<string, string>()
	for (const name of new Set(perModuleJs.flatMap(path => namesOf.get(path)!))) {
		if (alike.has(name)) continue
		const exporting = perModuleJs.filter(path =>
			namesOf.get(path)!.includes(name)
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
		js += reexporting([name], main, first)
		for (const path of others) {
			const alias = `${name}$${moduleOf(path).replace(/[^\w$]/g, "$")}`
			js += reexporting([`${name} as ${alias}`], main, path)
			assertMapsToOwnFile(path)
			// an entry's output is its own file
			if (entryPoints.includes(path)) continue
			ownFiles.set(
				path,
				(ownFiles.get(path) ?? `export * from ${specifierOf(path, main)};\n`) +
					reexporting([`${alias} as ${name}`], path, main)
			)
		}
	}
	writeFile(main, js)
	return ownFiles
}

/** a module's path from out/ without an extension, e.g. "keywords/ts" */
const moduleOf = (path: string) =>
	relative(fromCwd("out"), path).replace(/\\/g, "/").replace(/\.js$/, "")

/** the names a bundle exports (its metafile lists ambiguous ones too) */
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

/** throws unless package.json maps path's deep imports to path */
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

/** the JS at from that re-exports specifiers of the module at path */
const reexporting = (specifiers: string[], from: string, path: string) =>
	`export { ${specifiers.join(", ")} } from ${specifierOf(from, path)};\n`

/** a relative specifier for to, as imported from from */
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

/**
 * esbuild writes a class that refers to itself as `var X = class _X {...}`,
 * naming it _X, so rename it X along with its references to _X. Throws on a
 * function or class esbuild renamed apart from a like-named binding, as X2,
 * since that changes the name it has at runtime.
 */
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

/**
 * edits renaming the inner binding of `var name = class _X {...}` to name, if
 * every reference to _X in it then binds to the class's own name as it did to
 * _X: name appears nowhere in the class, and no _X in it is a property or
 * declaration name rather than a reference
 */
const renamesTo = (
	node: ts.ClassExpression,
	name: string
): Edit[] | undefined => {
	const inner = node.name!.text
	const renames: Edit[] = [[node.name!.getStart(), node.name!.getEnd(), name]]
	let renamable = true
	const visit = (child: ts.Node): void => {
		if (ts.isIdentifier(child)) {
			const parent = child.parent as { name?: ts.Node; propertyName?: ts.Node }
			if (child.text === name) renamable = false
			else if (child.text === inner) {
				if (parent.name === child || parent.propertyName === child)
					renamable = false
				else renames.push([child.getStart(), child.getEnd(), name])
			}
		}
		ts.forEachChild(child, visit)
	}
	ts.forEachChild(node, child => {
		if (child !== node.name) visit(child)
	})
	return renamable ? renames : undefined
}

/** the name of the variable node initializes, if any */
const inferredNameOf = (node: ts.Node): string | undefined =>
	(
		ts.isVariableDeclaration(node.parent) &&
		node.parent.initializer === node &&
		ts.isIdentifier(node.parent.name)
	) ?
		node.parent.name.text
	:	undefined

/** the name a function or class has at runtime, a class taking its variable's */
const runtimeNameOf = (node: ts.Node): string | undefined =>
	ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) ?
		node.name?.text
	: ts.isClassExpression(node) ? (inferredNameOf(node) ?? node.name?.text)
	: ts.isFunctionExpression(node) ? (node.name?.text ?? inferredNameOf(node))
	: ts.isArrowFunction(node) ? inferredNameOf(node)
	: undefined

/** the identifier esbuild suffixed with a number to rename name, if any */
const collidedNameOf = (name: string, identifiers: Set<string>) => {
	for (let end = name.length - 1; /\d/.test(name[end]); end--)
		if (identifiers.has(name.slice(0, end))) return name.slice(0, end)
}
