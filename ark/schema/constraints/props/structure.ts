import { flatMorph, omit, registeredReference, type Key } from "@arktype/util"
import type { Node } from "../../node.js"
import type { RawSchema } from "../../schema.js"
import type { IntersectionBasisKind } from "../../schemas/intersection.js"
import { defineRightwardIntersections } from "../../schemas/utils.js"
import type { NodeCompiler } from "../../shared/compile.js"
import {
	metaKeys,
	type BaseMeta,
	type declareNode
} from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { implementNode, type PropKind } from "../../shared/implement.js"
import { intersectNodes } from "../../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { RawConstraint } from "../constraint.js"
import type { IndexDef, IndexNode } from "./index.js"
import type { PropDef, PropNode } from "./prop.js"
import type { SequenceDef, SequenceNode } from "./sequence.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "throw" | "prune"

export interface StructureDef extends BaseMeta {
	prop?: readonly PropDef[]
	index?: readonly IndexDef[]
	sequence?: SequenceDef
	onExtraneousKey?: ExtraneousKeyBehavior
}

export interface StructureInner extends BaseMeta {
	prop?: readonly PropNode[]
	index?: readonly IndexNode[]
	sequence?: SequenceNode
	onExtraneousKey?: ExtraneousKeyRestriction
}

export type StructureDeclaration = declareNode<{
	kind: "structure"
	def: StructureDef
	normalizedDef: StructureDef
	inner: StructureInner
	prerequisite: object
	childKind: PropKind
}>

export class StructureNode extends RawConstraint<StructureDeclaration> {
	impliedBasis = this.$.keywords.object.raw

	nameSet =
		this.prop ? flatMorph(this.prop, (i, node) => [node.key, 1] as const) : {}
	nameSetReference = registeredReference(this.nameSet)
	expression = structureToString(this, "expression")

	requiredLiteralKeys: Key[] = flatMorph(this.children, (i, node) =>
		node.hasKind("prop") && node.required ? [i, node.key]
		: node.hasKind("sequence") ? node.prefix.map((el, i) => [i, `${i}`])
		: []
	)

	optionalLiteralKeys: Key[] = flatMorph(this.children, (i, node) =>
		node.hasKind("prop") && node.optional ? [i, node.key]
		: node.hasKind("sequence") ?
			node.optional.map((el, i) => [i, `${i + node.minLength}`])
		:	[]
	)

	literalKeys: Key[] = [
		...this.requiredLiteralKeys,
		...this.optionalLiteralKeys
	]

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
		this.children.every(prop => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.children.forEach(prop => prop.traverseApply(data as never, ctx))

	readonly exhaustive =
		this.onExtraneousKey !== undefined || this.index !== undefined

	compile(js: NodeCompiler): void {
		if (this.exhaustive) this.compileExhaustive(js)
		else this.compileEnumerable(js)
	}

	protected compileEnumerable(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.children.forEach(node =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
		} else this.children.forEach(node => js.line(js.invoke(node)))
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

			// TODO: replace error
			js.if("!matched", () => js.line(`throw new Error("strict")`))
		}

		return js
	}
}

export const structureImplementation = implementNode<StructureDeclaration>({
	kind: "structure",
	hasAssociatedError: false,
	normalize: schema => schema,
	keys: {
		prop: {
			child: true,
			parse: intersectionChildKeyParser("prop")
		},
		index: {
			child: true,
			parse: intersectionChildKeyParser("index")
		},
		sequence: {
			child: true,
			parse: intersectionChildKeyParser("sequence")
		},
		onExtraneousKey: {
			parse: def => (def === "ignore" ? undefined : def)
		}
	},
	defaults: {
		description: describeStructure
	},
	intersections: {
		structure: (l, r, ctx) => {
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

			return intersectIntersections(l, r, ctx)
		}
	}
})

const structureToString =
	(childStringProp: "expression" | "description") =>
	(inner: StructureInner) => {
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

const describeStructure = structureToString("description")
const structureExpression = structureToString("expression")
