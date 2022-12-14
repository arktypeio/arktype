import type { ConstraintFunction } from "../parse/tuple.js"
import type { Domain, ObjectDomain } from "../utils/classify.js"
import type {
    autocompleteString,
    Dictionary,
    keySet,
    listable,
    replaceKeys,
    stringKeyOf,
    subsume
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./keywords.js"

export type TypeNode<scope extends Dictionary = Dictionary> =
    | IdentifierNode<scope>
    | DomainNode<scope>

export type IdentifierNode<scope extends Dictionary = Dictionary> =
    Dictionary extends scope
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

// TODO: Add constrain
export type DomainNode<scope extends Dictionary = Dictionary> = {
    readonly bigint?:
        | true
        | listable<IdentifierNode<scope> | Unit<IntegerLiteral>>
    readonly boolean?: true | Unit<boolean>
    readonly null?: true
    readonly number?: true | listable<IdentifierNode<scope> | NumberRule>
    readonly object?: true | listable<IdentifierNode<scope> | ObjectConstraints>
    readonly string?: true | listable<IdentifierNode<scope> | StringRule>
    readonly symbol?: true
    readonly undefined?: true
}

export type resolved<t> = Exclude<t, IdentifierNode>

export type Predicate<
    domain extends Domain,
    scope extends Dictionary = Dictionary
> = NonNullable<DomainNode<scope>[domain]>

// TODO: identity
type Constraints = {
    // primitive constraints
    readonly regex?: listable<string>
    readonly divisor?: number
    // object constraints
    readonly requiredKeys?: keySet
    readonly props?: Dictionary<TypeNode>
    readonly propTypes?: {
        readonly number?: TypeNode
        readonly string?: TypeNode
    }
    readonly kind?: ObjectDomain
    // shared constraints
    readonly bounds?: Bounds
    // TODO: rename
    readonly constrain?: listable<ConstraintFunction>
}

export type ObjectConstraints = Pick<
    Constraints,
    "kind" | "props" | "requiredKeys" | "propTypes" | "bounds"
>

export type StringConstraints = Pick<Constraints, "regex" | "bounds">

export type StringRule = StringConstraints | Unit<string>

export type NumberConstraints = Pick<Constraints, "divisor" | "bounds">

export type NumberRule = NumberConstraints | Unit<number>

export type Unit<value extends UnitValue = UnitValue> = {
    readonly value: value
}

export type UnitValue = string | number | boolean

/** Supertype of TypeNode used for internal operations that can handle all
 * possible TypeNodes */
export type UnknownTypeNode = subsume<
    TypeNode,
    IdentifierNode | UnknownDomainNode
>

export type UnknownDomainNode = {
    readonly [k in Domain]?: UnknownPredicate
}

export type UnknownPredicate = true | listable<UnknownBranch>

export type UnknownBranch = IdentifierNode | UnknownRule

export type UnknownRule = UnknownConstraints | Unit

export type UnknownConstraints = replaceKeys<
    Constraints,
    {
        props: Dictionary<UnknownTypeNode>
        propTypes: {
            [k in keyof NonNullable<Constraints["propTypes"]>]: UnknownTypeNode
        }
    }
>
