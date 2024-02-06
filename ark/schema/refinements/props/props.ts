import { map, throwParseError } from "@arktype/util"
import { BaseNode, type Node } from "../../base.js"
import {
	js,
	type ApplyCompiler,
	type CompilationContext
} from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import {
	parseOpen,
	type PropKind,
	type TraversableNode
} from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../traversal/context.js"
import { registry } from "../../traversal/registry.js"
import type { FoldInput } from "../refinement.js"
import type { IndexNode, IndexSchema } from "./index.js"
import type { OptionalNode, OptionalSchema } from "./optional.js"
import type { RequiredNode, RequiredSchema } from "./required.js"
import type { SequenceNode, SequenceSchema } from "./sequence.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "throw" | "prune"

export interface PropsInner extends BaseMeta {
	readonly onExtraneousKey?: ExtraneousKeyRestriction
	readonly required?: readonly RequiredNode[]
	readonly optional?: readonly OptionalNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
}

export interface BasePropsSchema extends BaseMeta {
	readonly onExtraneousKey?: ExtraneousKeyBehavior
	readonly required?: readonly RequiredSchema[]
	readonly optional?: readonly OptionalSchema[]
	readonly index?: readonly IndexSchema[]
}

export interface ArrayPropsSchema extends BasePropsSchema {
	readonly sequence?: SequenceSchema
}

export type PropsSchema<base extends object = object> =
	base extends readonly unknown[] ? ArrayPropsSchema : BasePropsSchema

export type PropsDeclaration = declareNode<{
	kind: "props"
	schema: PropsSchema
	// ensure sequence is included as a parsed key
	normalizedSchema: ArrayPropsSchema
	inner: PropsInner
	composition: "composite"
	prerequisite: object
	childKind: PropKind
}>

export type NamedProp = RequiredNode | OptionalNode

export class PropsNode
	extends BaseNode<object, PropsDeclaration, typeof PropsNode>
	implements TraversableNode<object>
{
	static implementation = this.implement({
		keys: {
			onExtraneousKey: {
				parse: (def) => (def === "ignore" ? undefined : def)
			},
			optional: {
				child: true,
				parse: (def, ctx) => parseOpen("optional", def, ctx)
			},
			required: {
				child: true,
				parse: (def, ctx) => parseOpen("required", def, ctx)
			},
			index: {
				child: true,
				parse: (def, ctx) => parseOpen("index", def, ctx)
			},
			sequence: {
				child: true,
				parse: (def, ctx) => ctx.$.parseNode("sequence", def, ctx)
			}
		},
		normalize: (schema) => schema,
		hasAssociatedError: false,
		defaults: {
			description(inner) {
				return ""
			}
		}
	})

	readonly hasOpenIntersection = false
	readonly exhaustive = !this.onExtraneousKey && !this.index
	readonly named: readonly NamedProp[] = this.required
		? this.optional
			? [...this.required, ...this.optional]
			: this.required
		: this.optional ?? []
	readonly nameSet = map(this.named, (i, node) => [node.key, 1] as const)
	readonly nameSetReference = registry.register(this.nameSet)

	traverseAllows: TraverseAllows<object> = () => true

	compileAllows(ctx: CompilationContext) {
		return ""
	}

	protected compileEnumerableAllows(ctx: CompilationContext) {
		return this.children.reduceRight(
			(body, node) => node.compileAllows(ctx) + "\n" + body,
			"return true\n"
		)
	}

	protected compileExhaustiveAllows(ctx: CompilationContext) {
		return this.children.reduceRight(
			(body, node) => node.compileAllows(ctx) + "\n" + body,
			"return true\n"
		)
	}

	traverseApply: TraverseApply<object> = () => {}

	compileApply(js: ApplyCompiler) {
		return this.exhaustive
			? this.compileExhaustiveApply(js)
			: this.compileEnumerableApply(js)
	}

	protected compileEnumerableApply(ctx: CompilationContext) {
		return this.children.reduce(
			(body, node) => body + node.compileApply(ctx) + "\n",
			""
		)
	}

	protected compileExhaustiveApply(ctx: CompilationContext) {
		let body = ""

		this.named.forEach((prop) => (body += prop.compileApply(ctx) + "\n"))
		body += this.sequence?.compileApply(ctx) ?? ""
		body += `for(const k in ${js.data}) {\n`
		if (this.onExtraneousKey) {
			body += "let matched = false\n"
		}
		this.index?.forEach((node) => {
			body += `if(${node.key.compileAllowsInvocation(ctx, "k")}) {\n`
			body += node.value.compileApplyInvocation(ctx, `${js.data}[k]`) + "\n"
			if (this.onExtraneousKey) {
				body += "matched = true\n"
			}
			body += "}\n"
		})
		if (this.onExtraneousKey) {
			if (this.named.length !== 0) {
				body += `matched ||= k in ${this.nameSetReference}\n`
			}
			if (this.sequence) {
				body += `matched ||= ${arrayIndexMatcherReference}.test(k)\n`
			}
			// TODO: replace error
			body += `if(!matched) {
	throw new Error("strict")
}\n`
		}
		body += "}\n"

		return body
	}

	intersectOwnInner(r: PropsNode) {
		return this
	}

	foldIntersection(into: FoldInput<"props">) {
		if (into.basis?.domain !== "object") {
			throwParseError("")
		}
		into.props = this.intersectOwnKind(into.props)
		return into
	}
}
