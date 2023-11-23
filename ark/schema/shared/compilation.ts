import type { PropKind } from "../refinements/props/prop.js"
import type { Discriminant } from "../sets/discriminate.js"
import type { NodeKind, SetKind } from "./define.js"
import type { Node } from "./node.js"

export const In = "$arkRoot"

export type CompiledSuccessKind = "true" | "in" | "out"
export type CompiledFailureKind = "false" | "problems"

export type CompilationContext = {
	path: string[]
	discriminants: Discriminant[]
	successKind: CompiledSuccessKind
	failureKind: CompiledFailureKind
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
	return `if (!(${node.condition})) {
        ${
					ctx.failureKind === "false"
						? "return false"
						: compileProblem(node, ctx)
				}
}`
}

const compileProblem = (node: Node<PrimitiveKind>, ctx: CompilationContext) => {
	return "return false"
}
