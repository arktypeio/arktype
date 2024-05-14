import { CompiledFunction } from "@arktype/util"
import type { Node } from "../kinds.js"
import type { BaseNode } from "../node.js"
import type { Discriminant } from "../roots/discriminate.js"
import type { PrimitiveKind } from "./implement.js"
import type { TraversalKind } from "./traversal.js"

export interface InvokeOptions extends ReferenceOptions {
	arg?: string
}

export interface ReferenceOptions {
	kind?: TraversalKind
	bind?: string
}

export class NodeCompiler extends CompiledFunction<["data", "ctx"]> {
	path: string[] = []
	discriminants: Discriminant[] = []

	constructor(public traversalKind: TraversalKind) {
		super("data", "ctx")
	}

	invoke(node: BaseNode, opts?: InvokeOptions): string {
		const arg = opts?.arg ?? this.data
		if (this.requiresContextFor(node))
			return `${this.reference(node, opts)}(${arg}, ${this.ctx})`

		return `${this.reference(node, opts)}(${arg})`
	}

	reference(node: BaseNode, opts?: ReferenceOptions): string {
		const invokedKind = opts?.kind ?? this.traversalKind
		const base = `this.${node.id}${invokedKind}`
		return opts?.bind ? `${base}.bind(${opts?.bind})` : base
	}

	requiresContextFor(node: BaseNode): boolean {
		return this.traversalKind === "Apply" || node.allowsRequiresContext
	}

	initializeErrorCount(): this {
		return this.const("errorCount", "ctx.currentErrorCount")
	}

	returnIfFail(): this {
		return this.if("ctx.currentErrorCount > errorCount", () => this.return())
	}

	returnIfFailFast(): this {
		return this.if("ctx.failFast && ctx.currentErrorCount > errorCount", () =>
			this.return()
		)
	}

	checkReferenceKey(keyExpression: string, node: BaseNode): this {
		const requiresContext = this.requiresContextFor(node)
		if (requiresContext) this.line(`${this.ctx}.path.push(${keyExpression})`)

		this.check(node, {
			arg: `${this.data}${this.index(keyExpression)}`
		})
		if (requiresContext) this.line(`${this.ctx}.path.pop()`)

		return this
	}

	check(node: BaseNode, opts?: InvokeOptions): this {
		return this.traversalKind === "Allows" ?
				this.if(`!${this.invoke(node, opts)}`, () => this.return(false))
			:	this.line(this.invoke(node, opts))
	}

	compilePrimitive(node: Node<PrimitiveKind>): this {
		const pathString = this.path.join()
		if (
			node.kind === "domain" &&
			node.domain === "object" &&
			this.discriminants.some(d => d.path.join().startsWith(pathString))
		) {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			return this
		}
		if (
			(node.kind === "domain" || node.kind === "unit") &&
			this.discriminants.some(
				d =>
					d.path.join() === pathString &&
					(node.kind === "domain" ?
						d.kind === "domain" || d.kind === "value"
					:	d.kind === "value")
			)
		) {
			// if the discriminant has already checked the domain at the current path
			// (or an exact value, implying a domain), we don't need to recheck it
			return this
		}
		if (this.traversalKind === "Allows")
			return this.return(node.compiledCondition)

		return this.if(node.compiledNegation, () =>
			this.line(`${this.ctx}.error(${node.compiledErrorContext})`)
		)
	}

	writeMethod(name: string): string {
		return `${name}(${this.argNames.join(", ")}){\n${this.body}    }\n`
	}
}
