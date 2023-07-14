import type {
    NarrowConstraint,
    PropConstraint,
    SignatureConstraint
} from "../constraints/constraint.js"
import type { NumberPredicate } from "./number.js"
import type { ObjectPredicate } from "./object.js"
import type { StringPredicate } from "./string.js"
import type { UnitPredicate } from "./unit.js"

export type Predicate =
    | UnitPredicate
    | ObjectPredicate
    | NumberPredicate
    | StringPredicate

export class PredicateBase {
    readonly narrow?: readonly NarrowConstraint[]
    readonly prop?: readonly PropConstraint[]
    readonly signature?: readonly SignatureConstraint[]

    constructor() {}
}
