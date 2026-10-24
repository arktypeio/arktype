import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { ModuleScopes } from "@ark/aot/internal/scope.ts"
import { analyze } from "@typescript-eslint/scope-manager"
import { globSync, readFileSync } from "node:fs"
import { parseSync, visitorKeys, type Node } from "oxc-parser"

// TS nodes that hold values rather than types
const valueTsKinds = {
	TSAsExpression: 1,
	TSSatisfiesExpression: 1,
	TSTypeAssertion: 1,
	TSNonNullExpression: 1,
	TSInstantiationExpression: 1,
	TSEnumDeclaration: 1,
	TSEnumBody: 1,
	TSEnumMember: 1,
	TSModuleDeclaration: 1,
	TSModuleBlock: 1,
	TSImportEqualsDeclaration: 1,
	TSExternalModuleReference: 1,
	TSExportAssignment: 1,
	TSParameterProperty: 1,
	TSQualifiedName: 1
}

const parse = (file: string, source: string) =>
	parseSync(file, source, { range: true, preserveParens: false }).program

const typeRangesOf = (node: Node, ranges: [number, number][] = []) => {
	if (node.type.startsWith("TS") && !(node.type in valueTsKinds))
		ranges.push([node.start, node.end])
	for (const k of visitorKeys[node.type] ?? []) {
		const child = (node as never)[k] as Node | Node[] | null
		if (Array.isArray(child)) {
			for (const item of child) if (item) typeRangesOf(item, ranges)
		} else if (child) typeRangesOf(child, ranges)
	}
	return ranges
}

// where each reference resolves and whether each binding is assigned
const differencesOf = (file: string, source: string): string[] => {
	const scopes = new ModuleScopes(parse(file, source))
	const program = parse(file, source)
	const expected = analyze(program as never, {
		sourceType: "module",
		jsxPragma: null,
		lib: []
	})
	const typeRanges = typeRangesOf(program)
	const actualReferences: Record<number, string> = {}
	for (const reference of scopes.references) {
		if (reference.id.name === "arguments") continue
		actualReferences[reference.id.start] =
			reference.binding ? `${reference.binding.id.start}` : "global"
	}
	const result: string[] = []
	const expectedReferences: Record<number, string> = {}
	for (const scope of expected.scopes) {
		for (const reference of scope.references) {
			const start = reference.identifier.range[0]
			if (
				!reference.isValueReference ||
				reference.init ||
				reference.identifier.name === "arguments" ||
				typeRanges.some(([l, r]) => l <= start && start < r)
			)
				continue
			const defs = reference.resolved?.defs ?? []
			expectedReferences[start] =
				defs.find(def => `${def.name.range[0]}` === actualReferences[start]) ?
					actualReferences[start]
				: defs.length ? `${defs[0].name.range[0]}`
				: "global"
		}
	}
	for (const start in expectedReferences) {
		if (actualReferences[start] !== expectedReferences[start])
			result.push(`${file}@${start} resolves to ${actualReferences[start]}`)
	}
	for (const start in actualReferences)
		if (!(start in expectedReferences)) result.push(`${file}@${start} extra`)
	const isAssignedByStart: Record<number, boolean> = {}
	for (const scope of expected.scopes) {
		for (const variable of scope.variables) {
			// a value declared more than once counts as assigned
			const declarations = variable.defs.filter(
				def =>
					def.type !== "Type" &&
					def.node.type !== "TSDeclareFunction" &&
					!("declare" in def.node && def.node.declare)
			)
			for (const identifier of variable.identifiers) {
				isAssignedByStart[identifier.range[0]] =
					declarations.length > 1 ||
					variable.references.some(
						reference => reference.isWrite() && !reference.init
					)
			}
		}
	}
	for (const binding of scopes.bindingsById.values()) {
		const isAssigned = isAssignedByStart[binding.id.start]
		if (binding.kind !== "member" && isAssigned !== !!binding.writes.length)
			result.push(`${file}@${binding.id.start} assigned: ${isAssigned}`)
	}
	return result
}

contextualize(() => {
	it("resolves like scope-manager", () => {
		attest(
			differencesOf(
				"fixture.tsx",
				`import def, { a as b, type T } from "./a.ts"
import * as ns from "./ns.ts"
export { b as c }
export default function f(x = def, { y, ...rest } = ns.o, [z] = [x]) {
	var hoisted = y
	if (z) {
		const y = rest
		let x
		x = y
		return hoisted + x
	}
	function hoisted() {}
	return arguments.length
}
const C = class Inner extends (b as any) {
	static s = Inner
	field = this
	method(p: T) {
		return p ?? C
	}
}
enum E { a = 1, b = a * 2 }
namespace N { export const n = E.b }
declare namespace D { const d: string }
let counter = 0
counter++
for (const k in ns) counter += k.length
for (counter of [1, 2]) {}
try {
	throw counter
} catch ({ message }) {
	label: for (;;) break label
}
const tag = <C.Tag prop={N.n}>{counter}</C.Tag>
const fn = function named() { return named }
export * from "./star.ts"`
			)
		).equals([])
	})

	it("resolves the repo's sources like scope-manager", () => {
		const files = globSync(
			fromHere("..", "..", "{schema,util}", "**", "*.ts"),
			{
				exclude: path => path.includes("node_modules") || path.endsWith(".d.ts")
			}
		)
		attest(
			files.flatMap(file => differencesOf(file, readFileSync(file, "utf8")))
		).equals([])
	})

	it("finds exports and writes", () => {
		const scopes = new ModuleScopes(
			parse(
				"exports.ts",
				`let a = 1
a = 2
const b = { c: 1 }
b.c = 2
export { a, b as d }
export const e = a
export namespace N {
	export const f = e
}
export default b`
			)
		)
		attest(Object.keys(scopes.exportsByName)).snap([
			"e",
			"N",
			"default",
			"a",
			"d"
		])
		attest(
			Object.values(scopes.root.bindings).map(
				binding => `${binding.name} ${binding.writes.length}`
			)
		).snap(["a 1", "b 0", "e 0", "N 0"])
	})
})
