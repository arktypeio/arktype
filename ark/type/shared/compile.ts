import {
	CompiledFunction,
	compileSerializedValue,
	serializeLiteralKey,
	type Dict
} from "@arktype/util"
import type { Node, UnknownNode } from "../base.js"
import type { Discriminant } from "../types/discriminate.js"
import type { TraversalKind } from "./context.js"
import type { PrimitiveKind } from "./implement.js"

export const jsData = "data"
export const jsCtx = "ctx"

export type InvokeOptions = {
	arg?: string
	kind?: TraversalKind
}

export class NodeCompiler extends CompiledFunction<
	[typeof jsData, typeof jsCtx]
> {
	path: string[] = []
	discriminants: Discriminant[] = []

	constructor(public traversalKind: TraversalKind) {
		super(jsData, jsCtx)
	}

	invoke(node: UnknownNode, opts?: InvokeOptions): string {
		const invokedKind = opts?.kind ?? this.traversalKind
		const method = `${node.name}${invokedKind}`
		const arg = opts?.arg ?? this.data
		if (this.requiresContextFor(node)) {
			return `this.${method}(${arg}, ${this.ctx})`
		}
		return `this.${method}(${arg})`
	}

	requiresContextFor(node: UnknownNode): boolean {
		return (
			this.traversalKind === "Apply" || node.includesContextDependentPredicate
		)
	}

	returnIfHasErrors(): this {
		return this.if(`${this.ctx}.currentErrors.length !== 0`, () =>
			this.return()
		)
	}

	checkLiteralKey(key: PropertyKey, node: UnknownNode): this {
		const requiresContext = this.requiresContextFor(node)
		if (requiresContext) {
			this.line(`${this.ctx}.path.push(${serializeLiteralKey(key)})`)
		}
		this.check(node, {
			arg: `${this.data}${this.prop(key)}`
		})
		if (requiresContext) {
			this.line(`${this.ctx}.path.pop()`)
		}
		return this
	}

	checkReferenceKey(keyExpression: string, node: UnknownNode): this {
		const requiresContext = this.requiresContextFor(node)
		if (requiresContext) {
			this.line(`${this.ctx}.path.push(${keyExpression})`)
		}
		this.check(node, {
			arg: `${this.data}${this.index(keyExpression)}`
		})
		if (requiresContext) {
			this.line(`${this.ctx}.path.pop()`)
		}
		return this
	}

	check(node: UnknownNode, opts?: InvokeOptions): this {
		return this.traversalKind === "Allows"
			? this.if(`!${this.invoke(node, opts)}`, () => this.return(false))
			: this.line(this.invoke(node, opts))
	}

	compilePrimitive(node: Node<PrimitiveKind>): this {
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
		if (this.traversalKind === "Allows") {
			return this.return(node.compiledCondition)
		}
		return this.if(node.compiledNegation, () =>
			this.line(`${this.ctx}.error(${compileErrorContext(node.errorContext)})`)
		)
	}

	writeMethod(name: string): string {
		return `${name}(${this.argNames.join(", ")}){\n${this.body}    }\n`
	}
}

export const compileErrorContext = (ctx: Dict): string => {
	let result = "{ "
	for (const [k, v] of Object.entries(ctx)) {
		result += `${k}: ${compileSerializedValue(v)}, `
	}
	return result + " }"
}
