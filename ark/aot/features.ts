import { hasOwn } from "./util.ts"
import type { IssueFeatures } from "arktype/internal/standalone.ts"
import type { Node } from "oxc-parser"
import { SourceModule } from "./module.ts"
import { walk } from "./scope.ts"

// a module of @ark/schema or arktype that may read the issue features: built
// (`out/chunk-*.js`) or as written (`shared/issuesLean.ts`, `checkers.ts`)
export const issueFeatureReader =
	/[/\\](?:@?ark[/\\]schema(?:[/\\](?:out|shared))?|(?:ark[/\\]type|arktype)(?:[/\\]out)?)[/\\][^/\\]+\.[jt]s$/

// what exports them: the constants' own module, and each runtime entry
// exporting them again, @ark/schema's for arktype and arktype's for its own
const exportsFeatures = (specifier: unknown): boolean =>
	typeof specifier === "string" &&
	/(?:^arktype\/schema\/runtime(?:\/[\w-]+)?|[/\\](?:issueFeatures|runtime|schemaRuntime)(?:\.[jt]s)?)$/.test(
		specifier
	)

// named here rather than read off arktype's `noIssueFeatures`: a plugin loads
// this before it has checked that the arktype it resolves is one it runs on
const featureNames = Object.keys({
	reportsIndices: 1,
	bracketsKeys: 1,
	writesText: 1,
	callsSiteText: 1,
	listsUnions: 1,
	rewritesUnions: 1,
	traversesUnions: 1,
	appliesValues: 1,
	transformsBranches: 1,
	failsInBranches: 1,
	discriminatesBooleans: 1,
	labelsValues: 1,
	readsSummary: 1,
	readsErrors: 1,
	holdsExpression: 1,
	namesTraversalError: 1,
	findsOnRead: 1
} satisfies Record<keyof IssueFeatures, 1>)

// whether code names one, which a module reading it does
export const namesIssueFeature = (code: string): boolean =>
	featureNames.some(name => code.includes(name))

type Edit = [start: number, end: number, text: string]

/**
 * A runtime module with each read of an issue feature it imports written as what
 * a build found the feature to be, e.g. `reportsIndices && typeof k === "number"`
 * as `(false) && typeof k === "number"`, and the import left out. A bundler that doesn't
 * inline a constant across modules, like the webpack 5.98 Next builds with,
 * otherwise leaves each read to its minifier, and SWC folds none of them in a
 * chunk of megabytes.
 *
 * Undefined where the module reads none.
 */
export const writeIssueFeaturesInto = (
	id: string,
	code: string,
	issues: IssueFeatures
): string | undefined => {
	if (!namesIssueFeature(code)) return
	const module = new SourceModule(id, code, id)
	if (module.parseErrors.length) return
	const { scopes } = module
	const edits: Edit[] = []
	const valueByReference = new Map<Node, string>()
	// each import's specifiers that are written in, by its declaration
	const writtenByImport = new Map<Node, Set<Node>>()
	for (const binding of Object.values(scopes.root.bindings)) {
		const specifier = binding.declaration
		if (binding.kind !== "import" || specifier.type !== "ImportSpecifier")
			continue
		const declaration = specifier.parent as Node | undefined
		if (declaration?.type !== "ImportDeclaration") continue
		const imported =
			specifier.imported.type === "Identifier" ?
				specifier.imported.name
			:	specifier.imported.value
		if (
			!hasOwn(issues, imported) ||
			!exportsFeatures(declaration.source.value) ||
			binding.writes.length
		)
			continue
		// in parentheses, which esbuild reads as meant: it warns that `&&` after
		// a bare `false` always returns it, where the module isn't a dependency's
		const value = `(${issues[imported as keyof IssueFeatures]})`
		let isExported = false
		for (const { id } of binding.references) {
			// `export { appliesValues }`, as arktype's runtime exports
			// @ark/schema's: still the binding
			if ((id as Node).parent?.type === "ExportSpecifier") isExported = true
			else valueByReference.set(id, value)
		}
		if (isExported) continue
		let written = writtenByImport.get(declaration)
		if (!written) writtenByImport.set(declaration, (written = new Set()))
		written.add(specifier)
	}
	if (!valueByReference.size && !writtenByImport.size) return
	// `{ writesText }` holds the key too
	const shorthand = new Set<Node>()
	walk(module.program, node => {
		if (
			node.type === "Property" &&
			node.shorthand &&
			valueByReference.has(node.value)
		) {
			shorthand.add(node.value)
			edits.push([
				node.start,
				node.end,
				`${code.slice(node.value.start, node.value.end)}: ${valueByReference.get(node.value)}`
			])
		}
		return true
	})
	for (const [reference, value] of valueByReference) {
		if (!shorthand.has(reference))
			edits.push([reference.start, reference.end, value])
	}
	for (const [declaration, written] of writtenByImport) {
		if (declaration.type !== "ImportDeclaration") continue
		const kept = declaration.specifiers.filter(
			specifier => !written.has(specifier)
		)
		if (!kept.length) edits.push([declaration.start, declaration.end, ""])
		else if (kept.every(specifier => specifier.type === "ImportSpecifier")) {
			edits.push([
				declaration.specifiers[0].start,
				declaration.specifiers[declaration.specifiers.length - 1].end,
				kept
					.map(specifier => code.slice(specifier.start, specifier.end))
					.join(", ")
			])
		}
	}
	let written = code
	for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0]))
		written = written.slice(0, start) + text + written.slice(end)
	return written
}
