import type { NarrowConstraint } from "../constraints/constraint.js"
import type { NumberPredicate } from "./number.js"
import type { ObjectPredicate } from "./object.js"
import type { StringPredicate } from "./string.js"
import type { UnitPredicate } from "./unit.js"

export type Predicate =
    | UnitPredicate
    | ObjectPredicate
    | NumberPredicate
    | StringPredicate

export interface PredicateBase {
    readonly narrow?: readonly NarrowConstraint[]
}

// export type Predicate = Readonly<{
//     basis?: readonly [BasisConstraint]
//     range?:
//         | readonly [RangeConstraint]
//         | readonly [RangeConstraint, RangeConstraint]
//     divisor?: readonly [DivisorConstraint]
//     pattern?: readonly PatternConstraint[]
//     narrow?: readonly NarrowConstraint[]
//     prop?: readonly PropConstraint[]
//     signature?: readonly SignatureConstraint[]
//     variadic?: readonly [VariadicConstraint]
// }>
