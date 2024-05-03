import {
	append,
	flatMorph,
	registeredReference,
	type array,
	type Key
} from "@arktype/util"
import { BaseConstraint, constraintKeyParser } from "../constraint.js"
import type { BaseRoot } from "../roots/root.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { implementNode, type StructuralKind } from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { makeRootAndArrayPropertiesMutable } from "../shared/utils.js"
import type { IndexNode, IndexSchema } from "./index.js"
import type { BasePropNode, PropSchema } from "./prop.js"
import type { SequenceNode, SequenceSchema } from "./sequence.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "error" | "prune"

export interface StructureSchema extends BaseMeta {
	readonly optional?: readonly PropSchema[]
	readonly required?: readonly PropSchema[]
	readonly index?: readonly IndexSchema[]
	readonly sequence?: SequenceSchema
	readonly onExtraneousKey?: ExtraneousKeyBehavior
}

export interface StructureInner extends BaseMeta {
	readonly optional?: readonly BasePropNode[]
	readonly required?: readonly BasePropNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
	readonly onExtraneousKey?: ExtraneousKeyRestriction
}

export type StructureDeclaration = declareNode<{
	kind: "structure"
	schema: StructureSchema
	normalizedSchema: StructureSchema
	inner: StructureInner
	prerequisite: object
	childKind: StructuralKind
}>

export class StructureNode extends BaseConstraint<StructureDeclaration> {
	impliedBasis = this.$.keywords.object.raw

	props =
		this.required ?
			this.optional ?
				[...this.required, ...this.optional]
			:	this.required
		:	this.optional ?? []

	propsByKey = flatMorph(this.props, (i, node) => [node.key, node] as const)
	propsByKeyReference = registeredReference(this.propsByKey)
	expression = structuralExpression(this)

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

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.children.every(prop => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.children.forEach(prop => prop.traverseApply(data as never, ctx))

	readonly exhaustive =
		this.onExtraneousKey !== undefined || this.index !== undefined

	compile(js: NodeCompiler): void {
		if (this.exhaustive) this.compileExhaustive(js)
		else this.compileEnumerable(js)
	}

	omit(...keys: array<BaseRoot | Key>): StructureNode {
		return this.$.node("structure", omitFromInner(this.inner, keys))
	}

	merge(r: StructureNode): StructureNode {
		const inner = makeRootAndArrayPropertiesMutable(
			omitFromInner(r.inner, [r.keyof()])
		)
		if (r.required) inner.required = append(inner.required, r.required)
		if (r.optional) inner.optional = append(inner.optional, r.optional)
		if (r.index) inner.index = append(inner.index, r.index)
		if (r.sequence) inner.sequence = r.sequence
		if (r.onExtraneousKey) inner.onExtraneousKey = r.onExtraneousKey
		else delete inner.onExtraneousKey
		return this.$.node("structure", inner)
	}

	protected compileEnumerable(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.children.forEach(node =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
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
	(childStringProp: "expression" | "description") => (node: StructureNode) => {
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

export const structureImplementation = implementNode<StructureDeclaration>({
	kind: "structure",
	hasAssociatedError: false,
	normalize: schema => schema,
	keys: {
		required: {
			child: true,
			parse: constraintKeyParser("required")
		},
		optional: {
			child: true,
			parse: constraintKeyParser("optional")
		},
		index: {
			child: true,
			parse: constraintKeyParser("index")
		},
		sequence: {
			child: true,
			parse: constraintKeyParser("sequence")
		},
		onExtraneousKey: {
			parse: behavior => (behavior === "ignore" ? undefined : behavior)
		}
	},
	defaults: {
		description: structuralDescription
	},
	intersections: {
		structure: (l, r) => {
			if (l.onExtraneousKey) {
				const lKey = l.keyof()
				const disjointRKeys = r.requiredLiteralKeys.filter(k => !lKey.allows(k))
				if (disjointRKeys.length) {
					return Disjoint.from("presence", true, false).withPrefixKey(
						disjointRKeys[0]
					)
				}
			}
			if (r.onExtraneousKey) {
				const rKey = r.keyof()
				const disjointLKeys = l.requiredLiteralKeys.filter(k => !rKey.allows(k))
				if (disjointLKeys.length) {
					return Disjoint.from("presence", true, false).withPrefixKey(
						disjointLKeys[0]
					)
				}
			}

			// const constraintResult = intersectConstraints({
			// 	l: l.children,
			// 	r: r.children,
			// 	types: [],
			// 	ctx
			// })

			return r
		}
	}
})
