import {
	DynamicBase,
	conflatenateAll,
	flatMorph,
	reference,
	type Key
} from "@arktype/util"
import type { Node, TypeNode } from "../../base.js"
import { node } from "../../parser/parse.js"
import type { BaseScope } from "../../scope.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { PropKind } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import type { IntersectionNode } from "../../types/intersection.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "throw" | "prune"

export type PropsGroupInput = Pick<
	IntersectionNode,
	PropKind | "onExtraneousKey"
>

export class PropsGroup extends DynamicBase<PropsGroupInput> {
	constructor(
		public inner: PropsGroupInput,
		public $: BaseScope
	) {
		super(inner)
	}

	readonly exhaustive =
		this.onExtraneousKey !== undefined || this.index !== undefined
	readonly all = conflatenateAll<Node<PropKind>>(
		this.prop,
		this.index,
		this.sequence
	)
	readonly nameSet = this.prop
		? flatMorph(this.prop, (i, node) => [node.key, 1] as const)
		: {}
	readonly nameSetReference = reference(this.nameSet)
	readonly description = describeProps(this, "description")
	readonly expression = describeProps(this, "expression")
	readonly literalKeys = literalPropKeysOf(this.all)

	private keyofCache: TypeNode | undefined
	rawKeyOf(): TypeNode {
		if (!this.keyofCache) {
			let branches = this.$.units(this.literalKeys).branches
			this.index?.forEach(
				({ key }) => (branches = branches.concat(key.branches))
			)
			this.keyofCache = node("union", branches)
		}
		return this.keyofCache
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.all.every((prop) => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.all.forEach((prop) => prop.traverseApply(data as never, ctx))

	compile(js: NodeCompiler): void {
		if (this.exhaustive) {
			this.compileExhaustive(js)
		} else {
			this.compileEnumerable(js)
		}
	}

	protected compileEnumerable(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.all.forEach((node) =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
		} else {
			this.all.forEach((node) => js.line(js.invoke(node)))
		}
	}

	protected compileExhaustive(js: NodeCompiler): void {
		this.prop?.forEach((prop) => js.check(prop))
		this.sequence?.compile(js)
		if (this.sequence) js.check(this.sequence)
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
				if (this.prop?.length !== 0) {
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
	}
}

const literalPropKeysOf = (all: readonly Node<PropKind>[]) => {
	const keys: Key[] = []
	all.forEach((node) => {
		if (node.kind === "index") return
		if (node.kind === "prop") return keys.push(node.key)
		node.prevariadic.forEach((_, i) => keys.push(`${i}`))
	})
	return keys
}

const describeProps = (
	inner: PropsGroupInput,
	childStringProp: "expression" | "description"
) => {
	if (inner.prop || inner.index) {
		const parts = inner.index?.map(String) ?? []
		inner.prop?.forEach((node) => parts.push(node[childStringProp]))
		const objectLiteralDescription = `${
			inner.onExtraneousKey ? "exact " : ""
		}{ ${parts.join(", ")} }`
		return inner.sequence
			? `${objectLiteralDescription} & ${inner.sequence.description}`
			: objectLiteralDescription
	}
	return inner.sequence?.description ?? "{}"
}
