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
	for (const file of outputFiles)
		writeFile(file.path, dropRedundantNames(file.text))
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

/**
 * keepNames wraps each function or class bundling could rename in
 * __name(value, "name"), a defineProperty that also moves a function to
 * dictionary mode. Most calls set the name the language already gives value:
 * an anonymous function or class assigned to a variable, class field or
 * property of that name, or a declaration of that name. A class field's call
 * runs for every instance, so only calls that change a name are kept.
 */
const dropRedundantNames = (js: string): string => {
	const file = ts.createSourceFile(
		"bundle.js",
		js,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS
	)
	const edits: [start: number, end: number, replacement: string][] = []
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
					block.body.statements.length === 1 &&
					classNameOf(block.parent) === name
				)
					drop(block)
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
	return edits
		.sort(([l], [r]) => r - l)
		.reduce(
			(result, [start, end, replacement]) =>
				result.slice(0, start) + replacement + result.slice(end),
			js
		)
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
