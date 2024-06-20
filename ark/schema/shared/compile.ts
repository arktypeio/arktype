import { CompiledFunction } from "@arktype/util"
import type { BaseNode } from "../node.js"
import type { Discriminant } from "../roots/union.js"
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

	traverseKey(
		keyExpression: string,
		accessExpression: string,
		node: BaseNode
	): this {
		const requiresContext = this.requiresContextFor(node)
		if (requiresContext) this.line(`${this.ctx}.path.push(${keyExpression})`)

		this.check(node, {
			arg: accessExpression
		})
		if (requiresContext) this.line(`${this.ctx}.path.pop()`)

		return this
	}

	check(node: BaseNode, opts?: InvokeOptions): this {
		return this.traversalKind === "Allows" ?
				this.if(`!${this.invoke(node, opts)}`, () => this.return(false))
			:	this.line(this.invoke(node, opts))
	}

	writeMethod(name: string): string {
		return `${name}(${this.argNames.join(", ")}){\n${this.body}    }\n`
	}
}
