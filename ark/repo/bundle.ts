import { buildSync } from "esbuild"
import { join } from "node:path"
import ts from "typescript"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	readPackageJson,
	rmRf,
	walkPaths,
	writeFile
} from "../fs/index.ts"

export const bundle = (): void => {
	const modulePaths = walkPaths(fromCwd("out"), {
		include: path => path.endsWith(".js")
	})
	// a module several entries import evaluates once only if they share one build
	const { outputFiles } = buildSync({
		entryPoints: publicEntryPoints(process.cwd()),
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
	})
	for (const path of modulePaths) rmRf(path)
	for (const file of outputFiles)
		writeFile(file.path, nameSelfReferencingClasses(file.text))
}

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
