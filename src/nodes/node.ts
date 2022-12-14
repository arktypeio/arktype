import type {
    classify,
    Domain,
    inferDomain,
    ObjectDomain
} from "../utils/classify.js"
import type {
    autocompleteString,
    Dictionary,
    evaluate,
    extend,
    keySet,
    listable,
    stringKeyOf
} from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./keywords.js"

export type TypeNode<scope extends Dictionary = Dictionary> =
    | IdentifierNode<scope>
    | DomainNode<scope>

export type IdentifierNode<scope extends Dictionary = Dictionary> =
    Dictionary extends scope
        ? autocompleteString<Keyword>
        : Keyword | stringKeyOf<scope>

export type DomainNode<scope extends Dictionary = Dictionary> = {
    readonly [domain in Domain]?: Predicate<domain, scope>
}
export type resolved<t> = Exclude<t, IdentifierNode>

export type Predicate<
    domain extends Domain,
    scope extends Dictionary = Dictionary
> =
    | true
    | listable<
          | IdentifierNode<scope>
          | DomainConstraints[domain]
          | DomainValue<domain>
      >

type BaseConstraints<domain extends Domain = Domain> = {
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
    // TODO: make sure checked last
    readonly narrow?: listable<Narrow<inferDomain<domain>>>
}

export type NarrowConstraint<data = unknown> =
    | Narrow<data>
    | NarrowDomains<data>

export type Narrow<data = unknown> = (data: data) => boolean

export type NarrowDomains<data = unknown> = evaluate<{
    [domain in classify<data>]?: Narrow<Extract<data, inferDomain<domain>>>
}>

export type ObjectConstraints = Pick<
    BaseConstraints,
    "kind" | "props" | "requiredKeys" | "propTypes" | "bounds" | "narrow"
>

export type StringConstraints = Pick<
    BaseConstraints,
    "regex" | "bounds" | "narrow"
>

export type NumberConstraints = Pick<
    BaseConstraints,
    "divisor" | "bounds" | "narrow"
>

export type NarrowOnlyConstraints = Pick<BaseConstraints, "narrow">

export type DomainConstraints = extend<
    Record<Domain, BaseConstraints>,
    {
        bigint: NarrowOnlyConstraints
        boolean: NarrowOnlyConstraints
        null: NarrowOnlyConstraints
        number: NumberConstraints
        object: ObjectConstraints
        string: StringConstraints
        symbol: NarrowOnlyConstraints
        undefined: NarrowOnlyConstraints
    }
>

export type Identity<referenceValue = unknown> = {
    readonly value: referenceValue
}
