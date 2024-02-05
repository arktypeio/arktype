import { throwParseError } from "@arktype/util"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type {
	PrimitiveAttachmentsInput,
	PropKind
} from "../../shared/implement.js"
import { BaseRefinement, getBasisName, type FoldInput } from "../refinement.js"
import type { IndexNode, IndexSchema } from "./index.js"
import type { OptionalNode, OptionalSchema } from "./optional.js"
import type { RequiredNode, RequiredSchema } from "./required.js"
import type { SequenceNode, SequenceSchema } from "./sequence.js"

export type KeyCheckKind = "loose" | "strict" | "prune"

export type KeyRestrictionKind = "strict" | "prune"

export interface PropsInner extends BaseMeta {
	readonly keys?: KeyRestrictionKind
	readonly required?: readonly RequiredNode[]
	readonly optional?: readonly OptionalNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
}

export interface PropsSchema extends BaseMeta {
	readonly keys?: KeyCheckKind
	readonly required?: readonly RequiredSchema[]
	readonly optional?: readonly OptionalSchema[]
	readonly index?: readonly IndexSchema[]
	readonly sequence?: SequenceSchema
}

export type PropsDeclaration = declareNode<{
	kind: "props"
	schema: PropsSchema
	normalizedSchema: PropsSchema
	inner: PropsInner
	composition: "composite"
	prerequisite: object
	attachments: PrimitiveAttachmentsInput
	childKind: PropKind
}>

export class PropsNode extends BaseRefinement<
	PropsDeclaration,
	typeof PropsNode
> {
	static implementation = this.implement({
		keys: {
			keys: {},
			optional: {
				child: true,
				parse: (def, ctx) => parseOpenRefinement("optional", def, ctx)
			},
			required: {
				child: true,
				parse: (def, ctx) => parseOpenRefinement("required", def, ctx)
			},
			index: {
				child: true,
				parse: (def, ctx) => parseOpenRefinement("index", def, ctx)
			},
			sequence: {
				child: true,
				parse: (def, ctx) => parseClosedRefinement("sequence", def, ctx)
			}
		},
		normalize: (schema) => schema,
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.props === 1 ? "an integer" : `a multiple of ${inner.props}`
			}
		}
	})

	readonly constraintGroup = "shallow"
	readonly hasOpenIntersection = false
	traverseAllows = (data: number) => data % this.props === 0

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
