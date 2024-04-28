import {
	DynamicBase,
	type Key,
	conflatenateAll,
	flatMorph,
	registeredReference
} from "@arktype/util"
import type { Node } from "../../node.js"
import type { RawSchema } from "../../schema.js"
import type { IntersectionNode } from "../../schemas/intersection.js"
import type { RawSchemaScope } from "../../scope.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { PropKind } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "error" | "prune"

export type PropsGroupInput = Pick<
	IntersectionNode,
	PropKind | "onExtraneousKey"
>

export class PropsGroup extends DynamicBase<PropsGroupInput> {
	readonly requiredLiteralKeys: Key[] = []
	readonly optionalLiteralKeys: Key[] = []
	readonly literalKeys: Key[]

	readonly all = conflatenateAll<Node<PropKind>>(
		this.prop,
		this.index,
		this.sequence
	)

	constructor(
		public inner: PropsGroupInput,
		public $: RawSchemaScope
	) {
		super(inner)
		this.all.forEach(node => {
			if (node.kind === "index") return
			if (node.kind === "prop") {
				if (node.required) this.requiredLiteralKeys.push(node.key)
				else this.optionalLiteralKeys.push(node.key)
			} else {
				node.prevariadic.forEach((_, i) => {
					if (i < node.minLength) this.requiredLiteralKeys.push(`${i}`)
					else this.optionalLiteralKeys.push(`${i}`)
				})
			}
		})
		this.literalKeys = [
			...this.requiredLiteralKeys,
			...this.optionalLiteralKeys
		]
	}

	readonly nameSet =
		this.prop ? flatMorph(this.prop, (i, node) => [node.key, 1] as const) : {}
	readonly nameSetReference = registeredReference(this.nameSet)
	readonly description = describeProps(this, "description")
	readonly expression = describeProps(this, "expression")

	private keyofCache: RawSchema | undefined
	keyof(): RawSchema {
		if (!this.keyofCache) {
			let branches = this.$.units(this.literalKeys).branches
			this.index?.forEach(({ key }) => {
				branches = branches.concat(key.branches)
			})
			this.keyofCache = this.$.node("union", branches)
		}
		return this.keyofCache
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.all.every(prop => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.all.forEach(prop => prop.traverseApply(data as never, ctx))

	readonly exhaustive =
		this.onExtraneousKey !== undefined || this.index !== undefined

	compile(js: NodeCompiler): void {
		if (this.exhaustive) this.compileExhaustive(js)
		else this.compileEnumerable(js)
	}

	protected compileEnumerable(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.all.forEach(node =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
		} else this.all.forEach(node => js.line(js.invoke(node)))
	}

	protected compileExhaustive(js: NodeCompiler): void {
		this.prop?.forEach(prop => js.check(prop))
		this.sequence?.compile(js)
		if (this.sequence) js.check(this.sequence)
		Object.getOwnPropertySymbols
		js.const("keys", "Object.keys(data)")
		js.const("symbols", "Object.getOwnPropertySymbols(data)")
		js.if("symbols.length", () => js.line("keys.push(...symbols)"))
		js.for("i < keys.length", () => this.compileExhaustiveEntry(js))
	}

	protected compileExhaustiveEntry(js: NodeCompiler): NodeCompiler {
		js.const("k", "keys[i]")

		if (this.onExtraneousKey) js.let("matched", false)

		this.index?.forEach(node => {
			js.if(`${js.invoke(node.key, { arg: "k", kind: "Allows" })}`, () => {
				js.checkReferenceKey("k", node.value)
				if (this.onExtraneousKey) js.set("matched", true)
				return js
			})
		})

		if (this.onExtraneousKey) {
			if (this.prop?.length !== 0)
				js.line(`matched ||= k in ${this.nameSetReference}`)

			if (this.sequence)
				js.line(`matched ||= ${arrayIndexMatcherReference}.test(k)`)

			// // TODO: replace error
			// js.if("!matched", () => js.line(`throw new Error("strict")`))
		}

		return js
	}
}

const describeProps = (
	inner: PropsGroupInput,
	childStringProp: "expression" | "description"
) => {
	if (inner.prop || inner.index) {
		const parts = inner.index?.map(String) ?? []
		inner.prop?.forEach(node => parts.push(node[childStringProp]))
		const objectLiteralDescription = `${
			inner.onExtraneousKey ? "exact " : ""
		}{ ${parts.join(", ")} }`
		return inner.sequence ?
				`${objectLiteralDescription} & ${inner.sequence.description}`
			:	objectLiteralDescription
	}
	return inner.sequence?.description ?? "{}"
}
