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
import type { RegexAttribute } from "./regex.js"

export type TypeNode<scope extends Dictionary = Dictionary> =
    | Identifier<scope>
    | TypeTree<scope>

export type Identifier<scope extends Dictionary = Dictionary> =
    Dictionary extends scope
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type TypeTree<scope extends Dictionary = Dictionary> = {
    readonly bigint?: true | listable<Identifier<scope> | Unit<IntegerLiteral>>
    readonly boolean?: true | Unit<boolean>
    readonly null?: true
    readonly number?: true | listable<Identifier<scope> | NumberRule>
    readonly object?: true | listable<Identifier<scope> | ObjectConstraints>
    readonly string?: true | listable<Identifier<scope> | StringRule>
    readonly symbol?: true
    readonly undefined?: true
}

export type resolved<t> = Exclude<t, Identifier>

export type Predicate<
    domain extends Domain,
    scope extends Dictionary = Dictionary
> = NonNullable<TypeTree<scope>[domain]>

type NarrowableConstraints = {
    // primitive constraints
    readonly regex?: RegexAttribute
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
}

export type ObjectConstraints = Pick<
    NarrowableConstraints,
    "kind" | "props" | "requiredKeys" | "propTypes" | "bounds"
>

export type StringConstraints = Pick<NarrowableConstraints, "regex" | "bounds">

export type StringRule = StringConstraints | Unit<string>

export type NumberConstraints = Pick<
    NarrowableConstraints,
    "divisor" | "bounds"
>

export type NumberRule = NumberConstraints | Unit<number>

export type Unit<value extends UnitValue = UnitValue> = {
    readonly value: value
}

export type UnitValue = string | number | boolean

/** Supertype of TypeNode used for internal operations that can handle all
 * possible TypeNodes */
export type UnknownTypeNode = subsume<TypeNode, Identifier | UnknownDomain>

export type UnknownDomain = {
    readonly [k in Domain]?: UnknownPredicate
}

export type UnknownPredicate = true | listable<UnknownBranch>

export type UnknownBranch = Identifier | UnknownRule

export type UnknownRule = UnknownConstraints | Unit

export type UnknownConstraints = replaceKeys<
    NarrowableConstraints,
    {
        props: Dictionary<UnknownTypeNode>
        propTypes: {
            [k in keyof NonNullable<
                NarrowableConstraints["propTypes"]
            >]: UnknownTypeNode
        }
    }
>
