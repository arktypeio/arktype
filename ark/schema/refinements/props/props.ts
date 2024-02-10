import { map, reference, throwParseError } from "@arktype/util"
import { BaseNode } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { parseOpen, type PropKind } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../traversal/context.js"
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

export class PropsNode extends BaseNode<
	object,
	PropsDeclaration,
	typeof PropsNode
> {
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
				parse: (def, ctx) => ctx.$.parse("sequence", def, ctx)
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
	readonly exhaustive = this.onExtraneousKey || this.index
	readonly named: readonly NamedProp[] = this.required
		? this.optional
			? [...this.required, ...this.optional]
			: this.required
		: this.optional ?? []
	readonly nameSet = map(this.named, (i, node) => [node.key, 1] as const)
	readonly nameSetReference = reference(this.nameSet)

	traverseAllows: TraverseAllows<object> = () => true

	traverseApply: TraverseApply<object> = () => {}

	compile(js: NodeCompiler) {
		if (this.exhaustive) {
			this.compileExhaustive(js)
		} else {
			this.compileEnumerable(js)
		}
	}

	protected compileEnumerable(js: NodeCompiler) {
		if (js.traversalKind === "Allows") {
			this.children.forEach((node) =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
			js.return(true)
		} else {
			this.children.forEach((node) => js.line(js.invoke(node)))
		}
	}

	protected compileExhaustive(js: NodeCompiler) {
		this.named.forEach((prop) => prop.compile(js))
		this.sequence?.compile(js)
		js.forIn(js.data, () => {
			if (this.onExtraneousKey) {
				js.let("matched", false)
			}
			this.index?.forEach((node) => {
				js.if(`${js.invoke(node.key, { arg: "k", kind: "Allows" })}`, () => {
					if (js.traversalKind === "Allows") {
						js.if(`!${js.invoke(node.value, { arg: `${js.data}[k]` })}`, () =>
							js.return(false)
						)
					} else {
						js.line(js.invoke(node.value, { arg: `${js.data}[k]` }))
					}
					if (this.onExtraneousKey) {
						js.set("matched", true)
					}
					return js
				})
			})
			if (this.onExtraneousKey) {
				if (this.named.length !== 0) {
					js.line(`matched ||= k in ${this.nameSetReference}`)
				}
				if (this.sequence) {
					js.line(`matched ||= ${arrayIndexMatcherReference}.test(k)`)
				}
				// TODO: replace error
				js.if("!matched", () => js.line(`throw new Error("strict")`))
			}
			return js
		})
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
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
