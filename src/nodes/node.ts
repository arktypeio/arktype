import type {
    classify,
    Domain,
    Domains,
    NullishDomain,
    ObjectDomain
} from "../utils/classify.js"
import type {
    autocompleteString,
    Dictionary,
    evaluate,
    extend,
    keySet,
    listable,
    PartialDictionary,
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
    readonly [domain in Domain]?: Predicate<domain>
}
export type resolved<t> = Exclude<t, IdentifierNode>

export type Predicate<
    domain extends Domain,
    scope extends Dictionary = Dictionary
> = true | listable<IdentifierNode | ConstraintsOf<domain> | IdentityIn<domain>>

type Constraints<domain extends Domain = Domain> = {
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
    readonly narrow?: listable<PredicateNarrow<Domains[domain]>>
}

export type Narrow<data = unknown> = PredicateNarrow<data> | DomainNarrow<data>

export type PredicateNarrow<data = unknown> = (data: data) => boolean

export type DomainNarrow<data = unknown> = {
    [domain in classify<data>]?: PredicateNarrow<Extract<data, Domains[domain]>>
}

type UniqueConstraintKeyMap = extend<
    PartialDictionary<Domain, keyof Constraints>,
    {
        object: "kind" | "props" | "requiredKeys" | "propTypes" | "bounds"
        string: "regex" | "bounds"
        number: "divisor" | "bounds"
    }
>

export type ConstraintsOf<domain extends Domain> = domain extends NullishDomain
    ? never
    : evaluate<
          Pick<
              Constraints,
              | "narrow"
              | (domain extends keyof UniqueConstraintKeyMap
                    ? UniqueConstraintKeyMap[domain]
                    : never)
          >
      >

export type IdentityIn<domain extends Domain> = domain extends NullishDomain
    ? never
    : Identity<Domains[domain]>

export type Identity<referenceValue = unknown> = {
    readonly is: referenceValue
}
