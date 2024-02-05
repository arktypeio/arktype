import { throwParseError } from "@arktype/util"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type { PrimitiveAttachmentsInput } from "../../shared/implement.js"
import { BaseRefinement, getBasisName, type FoldInput } from "../refinement.js"
import type { IndexNode } from "./index.js"
import type { OptionalNode } from "./optional.js"
import type { RequiredNode } from "./required.js"
import type { SequenceNode } from "./sequence.js"

export interface PropsInner extends BaseMeta {
	readonly required?: readonly RequiredNode[]
	readonly optional?: readonly OptionalNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
}

export interface PropsSchema extends BaseMeta {
	readonly required?: readonly RequiredNode[]
	readonly optional?: readonly OptionalNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
}

export type PropsDeclaration = declareNode<{
	kind: "props"
	schema: PropsSchema
	normalizedSchema: PropsSchema
	inner: PropsInner
	composition: "primitive"
	prerequisite: number
	attachments: PrimitiveAttachmentsInput
}>

export class PropsNode extends BaseRefinement<
	PropsDeclaration,
	typeof PropsNode
> {
	static implementation = this.implement({
		collapseKey: "props",
		keys: {
			props: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { props: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.props === 1 ? "an integer" : `a multiple of ${inner.props}`
			}
		},
		attachments: (base) => ({
			primitive: true,
			compiledCondition: `${base.$.dataArg} % ${base.props} === 0`,
			compiledNegation: `${base.$.dataArg} % ${base.props} !== 0`
		})
	})

	readonly constraintGroup = "shallow"
	readonly hasOpenIntersection = false
	traverseAllows = (data: number) => data % this.props === 0

	intersectOwnInner(r: PropsNode) {
		return {
			props: Math.abs(
				(this.props * r.props) / greatestCommonProps(this.props, r.props)
			)
		}
	}

	foldIntersection(into: FoldInput<"props">) {
		if (into.basis?.domain !== "number") {
			throwParseError(writeIndivisibleMessage(getBasisName(into.basis)))
		}
		into.props = this.intersectOwnKind(into.props)
		return into
	}
}
