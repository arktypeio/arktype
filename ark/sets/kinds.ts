import type { NodeKind } from "@ark/schema"
import type { UnknownSetImplementation } from "./implement.ts"
import { predicate } from "./predicate.ts"
import { after } from "./refinements/after.ts"
import { before } from "./refinements/before.ts"
import { divisor } from "./refinements/divisor.ts"
import { exactLength } from "./refinements/exactLength.ts"
import { max } from "./refinements/max.ts"
import { maxLength } from "./refinements/maxLength.ts"
import { min } from "./refinements/min.ts"
import { minLength } from "./refinements/minLength.ts"
import { pattern } from "./refinements/pattern.ts"
import { alias } from "./roots/alias.ts"
import { domain } from "./roots/domain.ts"
import { intersection } from "./roots/intersection.ts"
import { morph } from "./roots/morph.ts"
import { proto } from "./roots/proto.ts"
import { union } from "./roots/union.ts"
import { unit } from "./roots/unit.ts"
import { index } from "./structure/index.ts"
import { optional } from "./structure/optional.ts"
import { required } from "./structure/required.ts"
import { sequence } from "./structure/sequence.ts"
import { structure } from "./structure/structure.ts"

export const setImplementationsByKind: Record<
	NodeKind,
	UnknownSetImplementation
> = {
	min,
	max,
	minLength,
	maxLength,
	exactLength,
	after,
	before,
	alias,
	domain,
	unit,
	proto,
	union,
	morph,
	intersection,
	divisor,
	pattern,
	predicate,
	required,
	optional,
	index,
	sequence,
	structure
} satisfies Record<NodeKind, unknown> as never
