import type { Node } from "../base.js"
import type { TraversalMethodsByKind } from "../traversal/context.js"
import type { Discriminant } from "../types/discriminate.js"
import type { PrimitiveKind } from "./implement.js"

export const js = {
	data: "data",
	ctx: "ctx",
	line: (statement: string) => `${statement}\n`,
	if: (condition: string, then: string) => `if (${condition}) {
	${then}
}\n`,
	elseIf: (condition: string, then: string) => `else if (${condition}) {
	${then}
}\n`,
	else: (then: string) => `else {
	${then}
}\n`,
	for: (until: string, body: string) => `for (let i = 0; ${until}; i++) {
	${body}
}\n`,
	forIn: (object: string, body: string) => `for (const k in ${object}) {
	${body}
}\n`,
	return: (expression: string) => `return ${expression}\n`,
	traversePrimitive: (
		traversalKind: TraversalKind,
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
		return traversalKind === "allows"
			? js.return(node.compiledCondition)
			: js.if(
					node.compiledNegation,
					`${js.ctx}.error(${JSON.stringify(node.expectedContext)})`
			  )
	}
}

export type CompilationContext = {
	path: string[]
	discriminants: Discriminant[]
}

export type TraversalKind = keyof TraversalMethodsByKind
