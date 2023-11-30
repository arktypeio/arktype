import {
	CompiledFunction,
	hasDomain,
	serializePrimitive,
	type SerializablePrimitive,
	type arraySubclassToReadonly,
	type propwiseXor
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Predicate } from "../refinements/predicate.js"
import type { PropKind } from "../refinements/props/prop.js"
import type { Discriminant } from "../sets/discriminate.js"
import type { InputData, NodeAttachments } from "./declare.js"
import type { BaseInitializedNode, NodeKind, SetKind } from "./define.js"

export const In = "$arkRoot"

export type CompilationKind = "allows" | "apply"

export type CompiledAllows<input = unknown, narrowed extends input = input> = (
	data: input
) => data is narrowed

export type CompiledTraverse<input = unknown> = (
	data: input,
	problems: readonly Problem[]
) => void

export type CompiledMethods<input = unknown, narrowed extends input = input> = {
	allows: CompiledAllows<input, narrowed>
	apply: CompiledTraverse<narrowed>
}

export type CompilationContext = {
	path: string[]
	discriminants: Discriminant[]
	compilationKind: CompilationKind
}

export type CompositeKind = SetKind | PropKind

export type PrimitiveKind = Exclude<NodeKind, CompositeKind>

// TODO: allows/apply root needed for refinements?
export const bindCompiledScope = (
	nodesToBind: readonly Node[],
	references: readonly Node[]
) => {
	const compiledAllowsTraversals = compileScope(references, "allows")
	const compiledApplyTraversals = compileScope(references, "apply")
	for (const node of nodesToBind) {
		node.traverseAllows = compiledAllowsTraversals[node.id].bind(
			compiledAllowsTraversals
		)
		if (!node.includesContextDependentPredicate) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = node.traverseAllows as never
		}
		node.traverseApply = compiledApplyTraversals[node.id].bind(
			compiledApplyTraversals
		)
	}
}

const compileScope = <kind extends CompilationKind>(
	references: readonly Node[],
	kind: kind
): Record<string, CompiledMethods[kind]> => {
	const compiledArgs = kind === "allows" ? In : `${In}, problems`
	const body = `return {
	${references
		.map(
			(reference) => `${reference.id}(${compiledArgs}){
${reference.compileBody({
	compilationKind: kind,
	path: [],
	discriminants: []
})}
}`
		)
		.join(",\n")}
}`
	return new CompiledFunction(body)() as never
}

export const composePrimitiveTraversal =
	<kind extends PrimitiveKind>(
		node: BaseInitializedNode<kind>,
		predicate: Predicate<InputData<kind>>
	): NodeAttachments<kind>["traverseApply"] =>
	(data, problems) => {
		if (!predicate(data, problems)) {
			problems.add(node.description)
		}
	}

export const compilePrimitive = (
	node: Node<PrimitiveKind>,
	ctx: CompilationContext
) => {
	const pathString = ctx.path.join()
	if (
		node.kind === "domain" &&
		node.domain === "object" &&
		ctx.discriminants.some((d) => d.path.join().startsWith(pathString))
	) {
		// if we've already checked a path at least as long as the current one,
		// we don't need to revalidate that we're in an object
		return ""
	}
	if (
		(node.kind === "domain" || node.kind === "unit") &&
		ctx.discriminants.some(
			(d) =>
				d.path.join() === pathString &&
				(node.kind === "domain"
					? d.kind === "domain" || d.kind === "value"
					: d.kind === "value")
		)
	) {
		// if the discriminant has already checked the domain at the current path
		// (or an exact value, implying a domain), we don't need to recheck it
		return ""
	}
	return ctx.compilationKind === "allows"
		? `return ${node.condition}`
		: `if (${node.negatedCondition}) {
	${compilePrimitiveProblem(node, ctx)}
}`
}

export class ArkTypeError extends TypeError {
	override cause: Problems

	constructor(problems: Problems) {
		super(`${problems}`)
		this.cause = problems
	}
}

export class Problem {
	public message: string

	constructor(
		public path: string[],
		public description: string
	) {
		this.message = path.length
			? `${path.join(".")} must be ${description}`
			: `Must be ${description}`
	}

	toString() {
		return this.message
	}
}

class ProblemsArray extends Array<Problem> {
	currentPath: string[] = []
	byPath: Record<string, Problem> = {}
	count = 0

	add(description: string) {
		const problem = new Problem([...this.currentPath], description)
		const pathKey = this.currentPath.join(".")
		const existing = this.byPath[pathKey]
		if (existing) {
			// if (existing.hasCode("intersection")) {
			// 	existing.rule.push(problem)
			// } else {
			// 	const problemIntersection = new ProblemIntersection(
			// 		[existing, problem],
			// 		problem.data,
			// 		problem.path
			// 	)
			// 	const existingIndex = this.indexOf(existing)
			// 	// If existing is found (which it always should be unless this was externally mutated),
			// 	// replace it with the new problem intersection. In case it isn't for whatever reason,
			// 	// just append the intersection.
			// 	this[existingIndex === -1 ? this.length : existingIndex] =
			// 		problemIntersection
			// 	this.byPath[pathKey] = problemIntersection
			// }
		} else {
			this.byPath[pathKey] = problem
			this.push(problem)
		}
		this.count++
		return problem
	}

	get summary() {
		return this.toString()
	}

	override toString() {
		return this.join("\n")
	}

	throw(): never {
		throw new ArkTypeError(this)
	}
}

export const Problems: new () => Problems = ProblemsArray

// TODO: fix
export type ProblemCode = string

export type CheckResult<t = unknown> = propwiseXor<
	{ data: t },
	{ problems: Problems }
>

export type Problems = arraySubclassToReadonly<ProblemsArray>

const compilePrimitiveProblem = (
	node: Node<PrimitiveKind>,
	ctx: CompilationContext
) => {
	return `problems.add(${JSON.stringify(node.description)})`
}

export const compileSerializedValue = (value: unknown) => {
	return hasDomain(value, "object") || typeof value === "symbol"
		? $ark.register(value)
		: serializePrimitive(value as SerializablePrimitive)
}
