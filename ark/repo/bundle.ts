import { buildSync } from "esbuild"
import { dirname, relative, resolve } from "node:path"
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
 * Every export without a * outside "./internal/" (".", "./config",
 * "./runtime") is an entry of one build, so a module more than one of them
 * imports, like the one that installs the registry, is evaluated once
 * whichever is imported first. Other packages stay imports, each resolving to
 * its own bundle.
 *
 * out/ keeps a .d.ts per module, which "./internal/*" resolves to for types.
 * At runtime it resolves to the main entry, so a deep import shares its
 * modules instead of evaluating copies of them, and the main entry exports
 * every name any module exports, whether or not its .d.ts declares it. A name
 * the main entry exports otherwise, or "default", it exports under an alias,
 * and the module gets a file of its own that exports the main entry's names
 * and that one under its own, which package.json must map the module's deep
 * imports to. "./internal/config.ts" (and .js) resolves to the config entry,
 * so configuring through it still runs before the rest of the package
 * evaluates, as keyword config must.
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
		// a class that refers to itself would otherwise be named _ClassName
		keepNames: true,
		write: false,
		logLevel: "warning"
	})
	for (const path of perModuleJs) rmRf(path)
	const bundles = outputFiles.map(file => dropRedundantNames(file.text))
	const withoutHelper = bundles.map(withoutNameHelper)
	const helperRead = withoutHelper.includes(undefined)
	for (let i = 0; i < outputFiles.length; i++)
		writeFile(outputFiles[i].path, helperRead ? bundles[i] : withoutHelper[i]!)
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
 * Appends to main's JS an export of each name a module exports and main
 * doesn't, from a module main already evaluates where one exports it. Main
 * then evaluates the modules it did in the same order, then any it didn't
 * that export a name, then its own code. Returns the JS of each module's own
 * file, for modules but entries exporting a name main binds otherwise.
 */
const flattenInto = (
	entryPoints: string[],
	perModuleJs: string[]
): Map<string, string> => {
	const main = fromCwd("out", "index.js")
	const records = new Map(
		perModuleJs.map(path => [path, moduleRecordOf(path, readFile(path))])
	)
	const exports = new Map(
		perModuleJs.map(path => [path, exportsOf(records, path)])
	)
	const evaluated = evaluatedBy(records, [main])
	// modules main evaluates provide a name first
	const byProvider = [
		...perModuleJs.filter(path => evaluated.has(path)),
		...perModuleJs.filter(path => !evaluated.has(path))
	]
	const taken = new Set(
		perModuleJs.flatMap(path => [...exports.get(path)!.keys()])
	)
	const bound = new Map(exports.get(main))
	// the name main exports each binding it can't export under its own as
	const aliases = new Map<Binding, string>()
	const reexports = new Map<string, string[]>()
	const reexport = (path: string, specifier: string) =>
		reexports.set(path, [...(reexports.get(path) ?? []), specifier])
	const ownFiles = new Map<string, string>()
	for (const path of byProvider) {
		const overrides: string[] = []
		for (const [name, binding] of exports.get(path)!) {
			if (bound.get(name) === binding) continue
			if (name !== "default" && !bound.has(name)) {
				bound.set(name, binding)
				reexport(path, name)
				continue
			}
			let alias = aliases.get(binding)
			if (!alias) {
				alias = `${name}$${relative(fromCwd("out"), path)
					.replace(/\.js$/, "")
					.replace(/[^\w$]/g, "$")}`
				if (taken.has(alias))
					throw new Error(`${alias}, an alias for ${path}'s ${name}, is taken`)
				taken.add(alias)
				aliases.set(binding, alias)
				reexport(path, `${name} as ${alias}`)
			}
			overrides.push(`${alias} as ${name}`)
		}
		if (overrides.length) {
			assertMapsToOwnFile(path)
			// an entry's output is its own file
			if (!entryPoints.includes(path)) {
				ownFiles.set(
					path,
					`export * from ${specifierOf(path, main)};\n` +
						reexporting(overrides, path, main)
				)
			}
		}
	}
	writeFile(
		main,
		readFile(main) +
			[...reexports]
				.map(([path, specifiers]) => reexporting(specifiers, main, path))
				.join("")
	)
	return ownFiles
}

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

/**
 * the names a module exports, sorted, and the binding each resolves to, as ES
 * modules link them: a name two `export *` resolve to different bindings is
 * ambiguous, so not exported, and a module's own exports shadow any
 * `export *` of the same name
 */
const exportsOf = (
	records: Map<string, ModuleRecord>,
	path: string
): Map<string, Binding> => {
	const bindings = new Map<string, Binding>()
	for (const name of exportedNames(records, path, new Set()).sort()) {
		const binding = bindingOf(records, path, name, new Set())
		if (binding && binding !== "ambiguous") bindings.set(name, binding)
	}
	return bindings
}

/** the modules of records that evaluating those at paths evaluates */
const evaluatedBy = (
	records: Map<string, ModuleRecord>,
	paths: string[],
	evaluated = new Set<string>()
): Set<string> => {
	for (const path of paths) {
		if (evaluated.has(path) || !records.has(path)) continue
		evaluated.add(path)
		evaluatedBy(records, records.get(path)!.requests, evaluated)
	}
	return evaluated
}

/** where the value a module exports as a name is bound */
type ExportEntry =
	| { local: string }
	/** "*" is the other module's namespace */
	| { from: string; name: string }

type ModuleRecord = {
	/** the modules its imports and re-exports load */
	requests: string[]
	exports: Map<string, ExportEntry>
	/** the modules `export *` re-exports */
	starFrom: string[]
}

/** a module and a name bound in it ("*" for its namespace), as JSON */
type Binding = string

const moduleRecordOf = (path: string, js: string): ModuleRecord => {
	const statements = parse(js).statements
	const moduleOf = (specifier: ts.Expression) => {
		const text = (specifier as ts.StringLiteral).text
		return text.startsWith(".") ? resolve(dirname(path), text) : text
	}
	const requests: string[] = []
	const imports = new Map<string, { from: string; name: string }>()
	for (const statement of statements) {
		if (
			(ts.isImportDeclaration(statement) ||
				ts.isExportDeclaration(statement)) &&
			statement.moduleSpecifier
		)
			requests.push(moduleOf(statement.moduleSpecifier))
		const clause = ts.isImportDeclaration(statement) && statement.importClause
		if (!clause) continue
		const from = moduleOf((statement as ts.ImportDeclaration).moduleSpecifier)
		if (clause.name) imports.set(clause.name.text, { from, name: "default" })
		const bindings = clause.namedBindings
		if (bindings && ts.isNamespaceImport(bindings))
			imports.set(bindings.name.text, { from, name: "*" })
		else if (bindings) {
			for (const { name, propertyName } of bindings.elements)
				imports.set(name.text, { from, name: (propertyName ?? name).text })
		}
	}
	const exports = new Map<string, ExportEntry>()
	const starFrom: string[] = []
	for (const statement of statements) {
		if (ts.isExportDeclaration(statement)) {
			const clause = statement.exportClause
			if (statement.moduleSpecifier) {
				const from = moduleOf(statement.moduleSpecifier)
				if (!clause) starFrom.push(from)
				else if (ts.isNamespaceExport(clause))
					exports.set(clause.name.text, { from, name: "*" })
				else {
					for (const { name, propertyName } of clause.elements)
						exports.set(name.text, { from, name: (propertyName ?? name).text })
				}
			} else if (clause && ts.isNamedExports(clause)) {
				for (const { name, propertyName } of clause.elements) {
					const local = (propertyName ?? name).text
					const imported = imports.get(local)
					// an imported namespace is re-exported as a local binding
					exports.set(
						name.text,
						imported && imported.name !== "*" ? imported : { local }
					)
				}
			}
			continue
		}
		const modifiers =
			ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
		const hasModifier = (kind: ts.SyntaxKind) =>
			modifiers?.some(modifier => modifier.kind === kind)
		if (
			ts.isExportAssignment(statement) ||
			hasModifier(ts.SyntaxKind.DefaultKeyword)
		)
			exports.set("default", { local: "*default*" })
		else if (!hasModifier(ts.SyntaxKind.ExportKeyword)) continue
		else if (ts.isVariableStatement(statement)) {
			for (const { name } of statement.declarationList.declarations)
				for (const local of boundNames(name)) exports.set(local, { local })
		} else {
			const local = (statement as ts.DeclarationStatement).name!.text
			exports.set(local, { local })
		}
	}
	return { requests, exports, starFrom }
}

const boundNames = (name: ts.BindingName): string[] =>
	ts.isIdentifier(name) ?
		[name.text]
	:	name.elements.flatMap(element =>
			ts.isOmittedExpression(element) ? [] : boundNames(element.name)
		)

/** GetExportedNames from the ECMAScript spec */
const exportedNames = (
	records: Map<string, ModuleRecord>,
	module: string,
	exportStarSet: Set<string>
): string[] => {
	if (exportStarSet.has(module)) return []
	exportStarSet.add(module)
	const record = records.get(module)
	if (!record) {
		throw new Error(
			`${module} is star-exported, but only the package's modules' names are known`
		)
	}
	const names = [...record.exports.keys()]
	for (const from of record.starFrom) {
		for (const name of exportedNames(records, from, exportStarSet))
			if (name !== "default" && !names.includes(name)) names.push(name)
	}
	return names
}

/**
 * ResolveExport from the ECMAScript spec: the binding a name a module exports
 * resolves to, null if it doesn't, or "ambiguous". Another package binds
 * every name it is asked for.
 */
const bindingOf = (
	records: Map<string, ModuleRecord>,
	module: string,
	name: string,
	resolveSet: Set<string>
): Binding | null => {
	const record = records.get(module)
	if (!record) return JSON.stringify([module, name])
	const request = JSON.stringify([module, name])
	if (resolveSet.has(request)) return null
	resolveSet.add(request)
	const entry = record.exports.get(name)
	if (entry) {
		return (
			"local" in entry ? JSON.stringify([module, entry.local])
			: entry.name === "*" ? JSON.stringify([entry.from, "*"])
			: bindingOf(records, entry.from, entry.name, resolveSet)
		)
	}
	if (name === "default") return null
	let starBinding: Binding | null = null
	for (const from of record.starFrom) {
		const binding = bindingOf(records, from, name, resolveSet)
		if (binding === "ambiguous") return binding
		if (!binding) continue
		if (!starBinding) starBinding = binding
		else if (binding !== starBinding) return "ambiguous"
	}
	return starBinding
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
 * keepNames wraps each function or class bundling could rename in
 * __name(value, "name"), a defineProperty that also moves a function to
 * dictionary mode. Most calls set the name the language already gives value:
 * an anonymous function or class assigned to a variable (declared or not),
 * class field or property of that name, or a declaration of that name. A
 * class field's call runs for every instance, so only calls that change a
 * name are kept.
 *
 * A class that refers to itself is written `var X = class _X {...}`, its
 * references inside bound to _X, and named in a static block. Static blocks
 * need Safari 16.4, newer than any other syntax in the output, so the class
 * is renamed X along with those references (see renamesTo), and the language
 * names it X.
 */
const dropRedundantNames = (js: string): string => {
	const file = parse(js)
	const edits: Edit[] = []
	const drop = (node: ts.Node) =>
		edits.push([node.getFullStart(), node.getEnd(), ""])
	const visit = (node: ts.Node): void => {
		const call = nameCallOf(node)
		if (call) {
			const { value, name } = call
			const statement = node.parent
			if (!ts.isExpressionStatement(statement)) {
				if (isAnonymous(value) && inferredNameOf(node) === name) {
					// keep value, dropping /* @__PURE__ */ __name( and , "name")
					edits.push([node.getFullStart(), value.getStart(), " "])
					edits.push([value.getEnd(), node.getEnd(), ""])
				}
			} else if (value.kind === ts.SyntaxKind.ThisKeyword) {
				// static { __name(this, "Name") }
				const block = statement.parent.parent
				if (
					ts.isClassStaticBlockDeclaration(block) &&
					block.body.statements.length === 1
				) {
					const renames =
						classNameOf(block.parent) === name ?
							[]
						:	renamesTo(block.parent, name)
					if (renames) {
						drop(block)
						edits.push(...renames)
					}
				}
			} else if (
				ts.isIdentifier(value) &&
				value.text === name &&
				(ts.isBlock(statement.parent) || ts.isSourceFile(statement.parent))
			) {
				// __name(fn, "fn") after function fn() {}
				const { statements } = statement.parent
				const preceding = statements[statements.indexOf(statement) - 1]
				if (
					preceding &&
					ts.isFunctionDeclaration(preceding) &&
					preceding.name?.text === name
				)
					drop(statement)
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(file)
	return applyEdits(js, edits)
}

/**
 * edits renaming the inner binding of `var name = class _X {...}` to name, if
 * every reference to _X in it then binds to the class's own name as it did to
 * _X: name appears nowhere in the class, and no _X in it is a property or
 * declaration name rather than a reference
 */
const renamesTo = (
	node: ts.ClassLikeDeclaration,
	name: string
): Edit[] | undefined => {
	if (
		!ts.isClassExpression(node) ||
		!node.name ||
		inferredNameOf(node) !== name
	)
		return
	const inner = node.name.text
	const renames: Edit[] = [[node.name.getStart(), node.name.getEnd(), name]]
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

/**
 * the file without keepNames' helper, or undefined if it reads the helper.
 * esbuild declares __name, and the __defProp it reads, in one file of the
 * build, which exports it to each other file that wrapped anything. Once no
 * file calls it, those declarations, imports and exports are all dead.
 */
const withoutNameHelper = (js: string): string | undefined => {
	const file = parse(js)
	const edits: Edit[] = []
	let helper: ts.Node | undefined
	let defProp: ts.Node | undefined
	const defPropReads: ts.Node[] = []
	let readsHelper = false
	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node) && node.text === "__name") {
			const { parent } = node
			if (isTopLevelDeclaration(parent)) helper = parent.parent.parent
			else if (
				(ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) &&
				!parent.propertyName
			)
				edits.push(withoutSpecifier(parent))
			else readsHelper = true
		} else if (ts.isIdentifier(node) && node.text === "__defProp") {
			if (isTopLevelDeclaration(node.parent))
				defProp = node.parent.parent.parent
			else defPropReads.push(node)
		}
		ts.forEachChild(node, visit)
	}
	visit(file)
	if (readsHelper) return
	// with the blank lines after it, since the helper leads the file
	const drop = (statement: ts.Node) => {
		let end = statement.getEnd()
		while (js[end] === "\n") end++
		edits.push([statement.getStart(), end, ""])
	}
	if (helper) drop(helper)
	// __defProp goes too if the helper was all that read it
	if (
		defProp &&
		defPropReads.every(
			read =>
				helper &&
				read.getStart() >= helper.getStart() &&
				read.getEnd() <= helper.getEnd()
		)
	)
		drop(defProp)
	return applyEdits(js, edits)
}

const isTopLevelDeclaration = (node: ts.Node) =>
	ts.isVariableDeclaration(node) &&
	ts.isVariableStatement(node.parent.parent) &&
	ts.isSourceFile(node.parent.parent.parent)

/** an edit removing specifier from its import or export */
const withoutSpecifier = (
	specifier: ts.ImportSpecifier | ts.ExportSpecifier
): Edit => {
	const { elements } = specifier.parent
	const i = elements.indexOf(specifier as never)
	if (elements.length > 1) {
		// with the comma after it, or before it if it is last
		return i < elements.length - 1 ?
				[specifier.getFullStart(), elements[i + 1].getFullStart(), ""]
			:	[elements[i - 1].getEnd(), specifier.getEnd(), ""]
	}
	if (ts.isExportSpecifier(specifier)) {
		const statement = specifier.parent.parent
		return [statement.getFullStart(), statement.getEnd(), ""]
	}
	// an import still loads its module, which evaluates in the same order
	const statement = specifier.parent.parent.parent
	return [
		statement.getStart(),
		statement.getEnd(),
		`import ${statement.moduleSpecifier.getText()};`
	]
}

const nameCallOf = (node: ts.Node) =>
	(
		ts.isCallExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "__name" &&
		node.arguments.length === 2 &&
		ts.isStringLiteral(node.arguments[1])
	) ?
		{ value: node.arguments[0], name: node.arguments[1].text }
	:	undefined

const isAnonymous = (node: ts.Expression): boolean => {
	while (ts.isParenthesizedExpression(node)) node = node.expression
	return (
		ts.isArrowFunction(node) ||
		((ts.isFunctionExpression(node) || ts.isClassExpression(node)) &&
			!node.name)
	)
}

/** the name an anonymous function or class gets from where it is assigned */
const inferredNameOf = (node: ts.Node): string | undefined => {
	const { parent } = node
	if (ts.isBinaryExpression(parent)) {
		return (
				parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					ts.isIdentifier(parent.left) &&
					parent.right === node
			) ?
				parent.left.text
			:	undefined
	}
	if (
		!(
			ts.isVariableDeclaration(parent) ||
			ts.isPropertyDeclaration(parent) ||
			ts.isPropertyAssignment(parent)
		) ||
		parent.initializer !== node
	)
		return
	const name =
		(
			ts.isIdentifier(parent.name) ||
			ts.isPrivateIdentifier(parent.name) ||
			ts.isStringLiteral(parent.name)
		) ?
			parent.name.text
		:	undefined
	// { __proto__: value } sets a prototype, not a property
	return ts.isPropertyAssignment(parent) && name === "__proto__" ?
			undefined
		:	name
}

const classNameOf = (node: ts.ClassLikeDeclaration) =>
	node.name ? node.name.text
	: ts.isClassExpression(node) ? inferredNameOf(node)
	: undefined
