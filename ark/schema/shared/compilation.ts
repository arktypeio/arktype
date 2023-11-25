import {
	hasDomain,
	serializePrimitive,
	type SerializablePrimitive,
	type arraySubclassToReadonly,
	type propwiseXor
} from "@arktype/util"
import type { Node } from "../parse.js"
import type { PropKind } from "../refinements/props/prop.js"
import type { Discriminant } from "../sets/discriminate.js"
import type { NodeKind, SetKind } from "./define.js"
import { isDotAccessible, registry } from "./registry.js"

export const In = "$arkRoot"

export type CompilationKind = "allows" | "traverse"

export type CompilationContext = {
	path: string[]
	discriminants: Discriminant[]
	compilationKind: CompilationKind
}

export type CompositeKind = SetKind | PropKind

export type PrimitiveKind = Exclude<NodeKind, CompositeKind>

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

class ProblemsArray extends Array<Problem> {
	byPath: Record<string, Problem> = {}
	count = 0

	add(problem: Problem) {
		const pathKey = `${problem.path}`
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

const problemsReference = registry().register(Problems)

const compilePrimitiveProblem = (
	node: Node<PrimitiveKind>,
	ctx: CompilationContext
) => {
	return `problems.push(
		{
			path: ${JSON.stringify(ctx.path)},
			message: \`Must be ${node.description} (was \${${In}})\`
		}
	)`
}

export type Problem = {
	path: string[]
	message: string
}

export const compileSerializedValue = (value: unknown) => {
	return hasDomain(value, "object") || typeof value === "symbol"
		? registry().register(value)
		: serializePrimitive(value as SerializablePrimitive)
}

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`
