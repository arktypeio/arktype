import { cached } from "@arktype/util"
import { type BasisKind } from "./bases/basis.ts"
import { DomainImplementation } from "./bases/domain.ts"
import { ProtoImplementation } from "./bases/proto.ts"
import { UnitImplementation } from "./bases/unit.ts"
import {
	DivisorImplementation,
	IntersectionImplementation,
	MaxImplementation,
	MinImplementation,
	MorphImplementation,
	OptionalImplementation,
	PatternImplementation,
	PredicateImplementation,
	RequiredImplementation,
	UnionImplementation
} from "./main.ts"
import { type Node, type NodeImplementationByKind } from "./nodes.ts"

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export type ParseContext = {
	basis: Node<BasisKind> | undefined
}

const getNodeImplementations = cached(
	() =>
		({
			union: UnionImplementation,
			morph: MorphImplementation,
			intersection: IntersectionImplementation,
			unit: UnitImplementation,
			proto: ProtoImplementation,
			domain: DomainImplementation,
			divisor: DivisorImplementation,
			max: MaxImplementation,
			min: MinImplementation,
			pattern: PatternImplementation,
			predicate: PredicateImplementation,
			required: RequiredImplementation,
			optional: OptionalImplementation
		}) satisfies NodeImplementationByKind
)

export const createParseContext = (): ParseContext => ({
	basis: undefined
})
