import {
	append,
	conflatenateAll,
	DynamicBase,
	flatMorph,
	registeredReference,
	type array,
	type Key,
	type RegisteredReference
} from "@arktype/util"
import type { Node } from "../kinds.js"
import type { BaseRoot } from "../roots/root.js"
import type { RawRootScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta } from "../shared/declare.js"
import type { StructuralKind } from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { makeRootAndArrayPropertiesMutable } from "../shared/utils.js"
import type { IndexNode } from "./index.js"
import type { OptionalNode } from "./optional.js"
import type { PropNode } from "./prop.js"
import type { RequiredNode } from "./required.js"
import type { SequenceNode } from "./sequence.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "error" | "prune"

export interface StructureInner extends BaseMeta {
	readonly optional?: readonly OptionalNode[]
	readonly required?: readonly RequiredNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
	readonly onExtraneousKey?: ExtraneousKeyRestriction
}

export class StructureGroup extends DynamicBase<StructureInner> {
	readonly children: array<Node<StructuralKind>>

	constructor(
		public inner: StructureInner,
		public $: RawRootScope
	) {
		super(inner)
		this.children = conflatenateAll<Node<StructuralKind>>(
			this.required,
			this.optional,
			this.index,
			this.sequence
		)
		this.literalKeys = [
			...this.requiredLiteralKeys,
			...this.optionalLiteralKeys
		]
	}

	props: array<PropNode> =
		this.required ?
			this.optional ?
				[...this.required, ...this.optional]
			:	this.required
		:	this.optional ?? []

	propsByKey: Record<Key, PropNode | undefined> = flatMorph(
		this.props,
		(i, node) => [node.key, node] as const
	)

	propsByKeyReference: RegisteredReference = registeredReference(
		this.propsByKey
	)

	requiredLiteralKeys: Key[] = this.required?.map(node => node.key) ?? []

	optionalLiteralKeys: Key[] = this.optional?.map(node => node.key) ?? []

	literalKeys: Key[] = [
		...this.requiredLiteralKeys,
		...this.optionalLiteralKeys
	]

	private _keyof: BaseRoot | undefined
	keyof(): BaseRoot {
		if (!this._keyof) {
			let branches = this.$.units(this.literalKeys).branches
			this.index?.forEach(({ index }) => {
				branches = branches.concat(index.branches)
			})
			this._keyof = this.$.node("union", branches)
		}
		return this._keyof
	}

	private _description: string | undefined
	get description() {
		this._description ??= structuralDescription(this)
		return this._description
	}

	private _expression: string | undefined
	get expression() {
		this._expression ??= structuralExpression(this)
		return this._expression
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.children.every(prop => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.children.forEach(prop => prop.traverseApply(data as never, ctx))

	readonly exhaustive: boolean =
		this.onExtraneousKey !== undefined || this.index !== undefined

	compile(js: NodeCompiler): void {
		if (this.exhaustive) this.compileExhaustive(js)
		else this.compileEnumerable(js)
	}

	omit(...keys: array<BaseRoot | Key>): StructureGroup {
		return new StructureGroup(omitFromInner(this.inner, keys), this.$)
	}

	merge(r: StructureGroup): StructureGroup {
		const inner = makeRootAndArrayPropertiesMutable(
			omitFromInner(r.inner, [r.keyof()])
		)
		if (r.required) inner.required = append(inner.required, r.required)
		if (r.optional) inner.optional = append(inner.optional, r.optional)
		if (r.index) inner.index = append(inner.index, r.index)
		if (r.sequence) inner.sequence = r.sequence
		if (r.onExtraneousKey) inner.onExtraneousKey = r.onExtraneousKey
		else delete inner.onExtraneousKey
		return new StructureGroup(inner, this.$)
	}

	protected compileEnumerable(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.children.forEach(node =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
			js.return(true)
		} else this.children.forEach(node => js.line(js.invoke(node)))
	}

	protected compileExhaustive(js: NodeCompiler): void {
		this.props.forEach(prop => js.check(prop))
		if (this.sequence) js.check(this.sequence)

		js.const("keys", "Object.keys(data)")
		js.const("symbols", "Object.getOwnPropertySymbols(data)")
		js.if("symbols.length", () => js.line("keys.push(...symbols)"))
		js.for("i < keys.length", () => this.compileExhaustiveEntry(js))
	}

	protected compileExhaustiveEntry(js: NodeCompiler): NodeCompiler {
		js.const("k", "keys[i]")

		if (this.onExtraneousKey) js.let("matched", false)

		this.index?.forEach(node => {
			js.if(`${js.invoke(node.index, { arg: "k", kind: "Allows" })}`, () => {
				js.checkReferenceKey("k", node.value)
				if (this.onExtraneousKey) js.set("matched", true)
				return js
			})
		})

		if (this.onExtraneousKey) {
			if (this.props?.length !== 0)
				js.line(`matched ||= k in ${this.propsByKeyReference}`)

			if (this.sequence)
				js.line(`matched ||= ${arrayIndexMatcherReference}.test(k)`)

			// TODO: replace error
			js.if("!matched", () => js.line(`throw new Error("strict")`))
		}

		return js
	}
}

const omitFromInner = (
	inner: StructureInner,
	keys: array<BaseRoot | Key>
): StructureInner => {
	const result = { ...inner }
	keys.forEach(k => {
		if (result.required) {
			result.required = result.required.filter(b =>
				typeof k === "function" ? k.allows(b.key) : k === b.key
			)
		}
		if (result.optional) {
			result.optional = result.optional.filter(b =>
				typeof k === "function" ? k.allows(b.key) : k === b.key
			)
		}
		if (result.index && typeof k === "function") {
			// we only have to filter index nodes if the input was a node, as
			// literal keys should never subsume an index
			result.index = result.index.filter(n => !n.index.extends(k))
		}
	})
	return result
}

const createStructuralWriter =
	(childStringProp: "expression" | "description") => (node: StructureGroup) => {
		if (node.props.length || node.index) {
			const parts = node.index?.map(String) ?? []
			node.props.forEach(node => parts.push(node[childStringProp]))
			const objectLiteralDescription = `${
				node.onExtraneousKey ? "exact " : ""
			}{ ${parts.join(", ")} }`
			return node.sequence ?
					`${objectLiteralDescription} & ${node.sequence.description}`
				:	objectLiteralDescription
		}
		return node.sequence?.description ?? "{}"
	}

const structuralDescription = createStructuralWriter("description")
const structuralExpression = createStructuralWriter("expression")
