import { CompiledFunction } from "@arktype/util"
import type { Node } from "../base.js"
import type {
	TraversalContext,
	TraversalKind,
	TraversalMethodsByKind
} from "../traversal/context.js"
import type { Discriminant } from "../types/discriminate.js"
import type { PrimitiveKind } from "./implement.js"

export class NodeCompiler<
	kind extends TraversalKind = TraversalKind,
	prerequisite = unknown
> extends CompiledFunction<
	["data", "ctx"],
	[prerequisite, TraversalContext],
	kind extends "allows" ? true : void
> {
	path: string[] = []
	discriminants: Discriminant[] = []

	constructor() {
		super("data", "ctx")
	}

	traversePrimitive(traversalKind: TraversalKind, node: Node<PrimitiveKind>) {
		const pathString = this.path.join()
		if (
			node.kind === "domain" &&
			node.domain === "object" &&
			this.discriminants.some((d) => d.path.join().startsWith(pathString))
		) {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			return ""
		}
		if (
			(node.kind === "domain" || node.kind === "unit") &&
			this.discriminants.some(
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
			? this.return(node.compiledCondition)
			: this.if(
					node.compiledNegation,
					`${this.ctx}.error(${JSON.stringify(node.expectedContext)})`
			  )
	}
}

export class AllowsCompiler<prerequisite = unknown> extends NodeCompiler<
	"allows",
	prerequisite
> {}

export class ApplyCompiler<prerequisite = unknown> extends NodeCompiler<
	"apply",
	prerequisite
> {}
