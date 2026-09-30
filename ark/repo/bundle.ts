import { buildSync } from "esbuild"
import ts from "typescript"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	readPackageJson,
	rmRf,
	walkPaths,
	writeFile
} from "../fs/index.ts"

/**
 * Replaces the JS tsc wrote to out/, one file per module, with an ESM bundle
 * of the package, so importing it loads a few files instead.
 *
 * Every export without a * (".", "./config", "./runtime") is an entry of one
 * build, so a module more than one of them imports, like the one that
 * installs the registry, is evaluated once whichever is imported first. Other
 * packages stay imports, each resolving to its own bundle.
 *
 * out/ keeps a .d.ts per module, which "./internal/*" resolves to for types.
 * At runtime it resolves to the main entry, whose modules a deep import then
 * shares instead of evaluating copies of them. "./internal/config.ts" (and
 * .js) resolves to the config entry, so configuring through it still runs
 * before the rest of the package evaluates, as keyword config must.
 */
export const bundle = (): void => {
	const perModuleJs = walkPaths(fromCwd("out"), {
		include: path => path.endsWith(".js")
	})
	const { outputFiles } = buildSync({
		entryPoints: publicEntryPoints(),
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
}

const publicEntryPoints = (): string[] => [
	...new Set(
		Object.entries<string | { default: string }>(
			readPackageJson(process.cwd()).exports
		).flatMap(([subpath, target]) => {
			const file = typeof target === "string" ? target : target.default
			return !subpath.includes("*") && file.endsWith(".js") ?
					[fromCwd(file)]
				:	[]
		})
	)
]

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
