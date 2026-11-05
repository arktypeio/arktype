import { hasDomain } from "@ark/util"
import { keyOf } from "arktype/internal/standalone.ts"
import type { Node } from "oxc-parser"
import { globalsByName } from "./builtins.ts"
import { contains, heldAs, isFunctionNode, type ModuleGraph } from "./graph.ts"
import { initOf, type Interpreter } from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import { operatorOf, unwrapExpression, walk, type Binding } from "./scope.ts"
import { isFoldable } from "./sites.ts"

// classes whose instances hold nothing a method they're called with changes
const fixedClasses = new Set(["Set", "Map", "TextEncoder"])

const fixedGlobals = new Set(["undefined", "NaN", "Infinity"])

type Located = [binding: Binding, module: SourceModule]

const typeKeys = [
	"typeAnnotation",
	"returnType",
	"typeParameters",
	"typeArguments"
]

const isNode = (value: unknown): value is Node =>
	typeof (value as Node | null)?.type === "string"

// what a function runs if it's written in another module, as JavaScript: undefined
// if it reads anything but what it declares and globals a module a build writes
// can't declare, or what it's bound to, like `this`, differs there
export const closedTextOf = (
	fn: Node & { start: number; end: number },
	module: SourceModule
): string | undefined => {
	const erased: [start: number, end: number][] = []
	const isClosed = (node: Node): boolean => {
		switch (node.type) {
			case "ThisExpression":
			case "Super":
			case "MetaProperty":
			case "ImportExpression":
			case "ClassExpression":
			case "ClassDeclaration":
				return false
			case "TSAsExpression":
			case "TSSatisfiesExpression":
			case "TSNonNullExpression":
				// parentheses around what it casts aren't in its span
				if (
					!/^\s*(?:as\b|satisfies\b|!)/.test(
						module.source.slice(node.expression.end, node.end)
					)
				)
					return false
				erased.push([node.expression.end, node.end])
				return isClosed(node.expression)
			case "Identifier": {
				if ((node as { optional?: boolean }).optional) return false
				const reference = module.scopes.byId.get(node)
				if (
					reference &&
					(reference.binding ?
						!contains(fn, reference.binding.id)
					:	!(node.name in globalsByName))
				)
					return false
			}
		}
		if (node.type.startsWith("TS") || node.type.startsWith("JSX")) return false
		for (const k in node) {
			if (k === "parent") continue
			const value = node[k as keyof Node] as unknown
			if (typeKeys.includes(k)) {
				if (isNode(value)) erased.push([value.start, value.end])
			} else if (
				!(Array.isArray(value) ? value : [value]).every(
					child => !isNode(child) || isClosed(child)
				)
			)
				return false
		}
		return true
	}
	if (!isClosed(fn)) return
	let text = ""
	let at = fn.start
	for (const [start, end] of erased.sort(([l], [r]) => l - r)) {
		text += module.source.slice(at, start)
		at = end
	}
	return text + module.source.slice(at, fn.end)
}

// Each run of a module's text creates its functions anew: a chunk imported
// again under a query, a module two queries load, a dynamic import retried.
// One variable can only hold what those runs create if they can't differ, so a
// function must read nothing outside itself but globals and what's declared as
// a value its text fixes, which nothing in the program can write.
export class SameEachRun {
	private byFunction = new Map<Node, boolean>()
	private graph: ModuleGraph
	private interpreter: Interpreter

	constructor(graph: ModuleGraph, interpreter: Interpreter) {
		this.graph = graph
		this.interpreter = interpreter
	}

	of(fn: Node, module: SourceModule): boolean {
		let result = this.byFunction.get(fn)
		if (result === undefined)
			this.byFunction.set(fn, (result = this.reads(fn, module, new Set())))
		return result
	}

	// `seen` answers for what's being read, so a cycle is as sound as what else
	// its members read, which each decides before the first returns
	private reads(fn: Node, module: SourceModule, seen: Set<Node>): boolean {
		if (seen.has(fn)) return true
		seen.add(fn)
		let same = true
		walk(fn, node => {
			if (same) {
				// `import.meta.url` differs under a query
				if (node.type === "MetaProperty") same = false
				else if (node.type === "Identifier")
					same = this.isSameRead(node, fn, module, seen)
			}
			return same
		})
		return same
	}

	private isSameRead(
		id: Node & { name: string },
		fn: Node,
		module: SourceModule,
		seen: Set<Node>
	): boolean {
		const reference = module.scopes.byId.get(id)
		// e.g. a member's or key's name
		if (!reference) return true
		const { binding } = reference
		if (!binding) return id.name !== "eval"
		const isSelf = binding.kind === "function" && binding.declaration === fn
		if (!isSelf && contains(fn, binding.id)) return true
		const located = this.locate(binding, module)
		if (located === "arktype") return true
		if (!located) return false
		const [origin, declaring] = located
		const source =
			origin.kind === "function" ?
				!origin.writes.length && origin.declaration
			:	origin.kind === "const" && initOf(origin)
		if (!source) return false
		// a read passing a function on could write what's on it, and nothing
		// keeps a run's from another's where one compares them
		if (isFunctionNode(source)) {
			const [callee, parent] = operatorOf(id)
			return (
				parent?.type === "CallExpression" &&
				parent.callee === callee &&
				this.reads(source, declaring, seen)
			)
		}
		return (
			this.fixedDepthOfBinding(origin, declaring, new Set()) !== undefined ||
			this.isSameType(origin, declaring, seen)
		)
	}

	// a Type is immutable, so it differs only by the functions it holds
	private isSameType(
		binding: Binding,
		module: SourceModule,
		seen: Set<Node>
	): boolean {
		const value = this.interpreter.valueOfBinding(binding, module)
		return (
			isFoldable(value) &&
			keyOf(value)[1].every(hole => {
				const standIn =
					hasDomain(hole, "object") ?
						this.interpreter.standIns.get(hole)
					:	undefined
				return (
					standIn?.closure &&
					!standIn.closure.env &&
					this.reads(standIn.closure.node, standIn.module, seen)
				)
			})
		)
	}

	private locate(
		binding: Binding,
		module: SourceModule
	): Located | "arktype" | undefined {
		if (binding.kind !== "import") return [binding, module]
		const target = this.graph.importOf(binding, module)
		return (
			target.kind === "binding" ? [target.binding, target.module]
			: target.kind === "arktype" || target.kind === "arktypeNamespace" ?
				"arktype"
			:	undefined
		)
	}

	// how many levels down what a const holds can be written, which nothing does
	private fixedDepthOfBinding(
		binding: Binding,
		module: SourceModule,
		seen: Set<Binding>
	): number | undefined {
		if (seen.has(binding) || binding.kind !== "const") return
		seen.add(binding)
		const init = initOf(binding)
		const depth = init ? this.fixedDepthOf(init, module, seen) : undefined
		if (!depth) return depth as 0 | undefined
		return (
				this.graph.mayWritesOf(binding, module, heldAs(depth)).length ||
					this.graph.elsewhereOf(module, binding, depth)
			) ?
				undefined
			:	depth
	}

	// what an expression's text alone decides, as how many levels down it holds
	// what could be written: 0 for a primitive
	private fixedDepthOf(
		expression: Node,
		module: SourceModule,
		seen: Set<Binding>
	): number | undefined {
		const node = unwrapExpression(expression)
		const deepest = (nodes: readonly (Node | null)[]) => {
			let depth = 0
			for (const operand of nodes) {
				if (!operand) continue
				const held = this.fixedDepthOf(
					operand.type === "SpreadElement" ? operand.argument : operand,
					module,
					seen
				)
				if (held === undefined) return
				depth = Math.max(depth, held)
			}
			return depth
		}
		const holding = (nodes: readonly (Node | null)[]) => {
			const depth = deepest(nodes)
			return depth === undefined ? undefined : depth + 1
		}
		const primitive = (nodes: readonly (Node | null)[]) =>
			deepest(nodes) === undefined ? undefined : 0
		switch (node.type) {
			case "Literal":
				// a regex with a `g` or `y` flag holds where it last matched
				return (
					!("regex" in node) || !node.regex ? 0
					: /[gy]/.test(node.regex.flags) ? undefined
					: 1
				)
			case "TemplateLiteral":
				return primitive(node.expressions)
			case "UnaryExpression":
				return node.operator === "delete" ?
						undefined
					:	primitive([node.argument])
			case "BinaryExpression":
				return primitive([node.left, node.right])
			case "LogicalExpression":
				return deepest([node.left, node.right])
			case "ConditionalExpression":
				return deepest([node.test, node.consequent, node.alternate])
			case "ArrayExpression":
				return holding(node.elements)
			case "ObjectExpression": {
				const values: Node[] = []
				for (const property of node.properties) {
					if (property.type === "SpreadElement") values.push(property)
					else if (
						property.kind !== "init" ||
						property.computed ||
						property.method
					)
						return
					else values.push(property.value)
				}
				return holding(values)
			}
			case "NewExpression":
				return (
						node.callee.type === "Identifier" &&
							!module.scopes.byId.get(node.callee)?.binding &&
							fixedClasses.has(node.callee.name)
					) ?
						holding(node.arguments)
					:	undefined
			case "Identifier": {
				const binding = module.scopes.byId.get(node)?.binding
				if (!binding) return fixedGlobals.has(node.name) ? 0 : undefined
				const located = this.locate(binding, module)
				return located && located !== "arktype" ?
						this.fixedDepthOfBinding(located[0], located[1], seen)
					:	undefined
			}
		}
	}
}
