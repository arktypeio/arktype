import { CompiledFunction } from "@arktype/util"
import type { Node } from "../base.js"
import type { TraversalContext, TraversalKind } from "../traversal/context.js"
import type { Discriminant } from "../types/discriminate.js"
import type { PrimitiveKind } from "./implement.js"

export const jsData = "data"
export const jsCtx = "ctx"

export class NodeCompiler<
	kind extends TraversalKind = TraversalKind,
	prerequisite = unknown
> extends CompiledFunction<
	[typeof jsData, typeof jsCtx],
	[prerequisite, TraversalContext],
	kind extends "allows" ? true : void
> {
	path: string[] = []
	discriminants: Discriminant[] = []

	constructor(public traversalKind: kind) {
		super(jsData, jsCtx)
	}

	invoke(node: Node, argName: string = this.data) {
		// TODO: only context if needed
		return `this.${node.name}(${argName}, ${this.ctx})`
	}

	compilePrimitive(
		node: Node<PrimitiveKind>,
		// allowed can be invoked from an apply but not the reverse
		kind = this.traversalKind as kind extends "apply" ? TraversalKind : "allows"
	) {
		const pathString = this.path.join()
		if (
			node.kind === "domain" &&
			node.domain === "object" &&
			this.discriminants.some((d) => d.path.join().startsWith(pathString))
		) {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			return this
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
			return this
		}
		return this.if(node.compiledNegation, () =>
			kind === "allows"
				? this.return(false)
				: this.line(
						`${this.ctx}.error(${JSON.stringify(node.expectedContext)})`
				  )
		)
	}
}

export type AllowsCompiler<prerequisite = unknown> = NodeCompiler<
	"allows",
	prerequisite
>

export type ApplyCompiler<prerequisite = unknown> = NodeCompiler<
	"apply",
	prerequisite
>
