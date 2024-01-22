import type { Node } from "../base.js"
import type { ExpectedContext } from "../kinds.js"
import type { TraversalMethodsByKind } from "../traversal/context.js"
import type { Discriminant } from "../types/discriminate.js"
import type { BasisKind, PrimitiveKind, PropKind } from "./define.js"

export type ConstraintKindsByGroup = {
	basis: BasisKind
	shallow: Exclude<PrimitiveKind, "predicate">
	deep: PropKind
	predicate: "predicate"
}

export type ConstraintGroup = keyof ConstraintKindsByGroup

export const precedenceByConstraintGroup: Record<ConstraintGroup, number> = {
	basis: 0,
	shallow: 1,
	deep: 2,
	predicate: 3
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
		? `return ${node.compiledCondition}`
		: `if (${node.compiledNegation}) {
${compilePrimitiveProblem(node, ctx)}
}`
}

export const createPrimitiveExpectedContext = <kind extends PrimitiveKind>(
	node: Node<kind>
): ExpectedContext<kind> =>
	Object.freeze({
		code: node.kind,
		description: node.description,
		...node.inner
	}) as never

export const compilePrimitiveProblem = (
	node: Node<PrimitiveKind>,
	ctx: CompilationContext
) => {
	return `${ctx.ctxArg}.error(${JSON.stringify(node.expectedContext)})`
}
export type CompilationContext = {
	dataArg: string
	ctxArg: string
	path: string[]
	discriminants: Discriminant[]
	compilationKind: TraversalKind
}

export type TraversalKind = keyof TraversalMethodsByKind
