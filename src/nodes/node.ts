import type {
    autocompleteString,
    Dictionary,
    keySet,
    listable,
    replaceKeys,
    supertype
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { ObjectSubtypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type TypeNode<alias extends string = string> =
    | Identifier<alias>
    | Resolution<alias>

export type Identifier<alias extends string = string> = string extends alias
    ? Keyword | alias
    : autocompleteString<Keyword>

export type Resolution<alias extends string = string> = {
    readonly bigint?:
        | true
        | listable<Identifier<alias> | PrimitiveLiteral<IntegerLiteral>>
    readonly boolean?: true | PrimitiveLiteral<boolean>
    readonly null?: true
    readonly number?:
        | true
        | listable<
              Identifier<alias> | PrimitiveLiteral<number> | NumberAttributes
          >
    readonly object?: true | listable<Identifier<alias> | ObjectAttributes>
    readonly string?:
        | true
        | listable<
              Identifier<alias> | PrimitiveLiteral<string> | StringAttributes
          >
    readonly symbol?: true
    readonly undefined?: true
}

export type ConstraintsOf<typeName extends TypeName> = NonNullable<
    Resolution[typeName]
>

export type ResolvedConstraintsOf<typeName extends TypeName> = Exclude<
    ConstraintsOf<typeName>,
    listable<string>
>

export type Attributes = {
    // primitive attributes
    readonly regex?: RegexAttribute
    readonly divisor?: number
    // object attributes
    readonly props?: Dictionary<TypeNode>
    readonly requiredKeys?: keySet
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectSubtypeName
    // shared attributes
    readonly bounds?: Bounds
}

type PropTypesAttribute = {
    readonly number?: TypeNode
    readonly string?: TypeNode
}

export type ObjectAttributes = Pick<
    Attributes,
    "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
>

export type StringAttributes = Pick<Attributes, "regex" | "bounds">

export type NumberAttributes = Pick<Attributes, "divisor" | "bounds">

export type LiteralValue = string | number | boolean

export type PrimitiveLiteral<value extends LiteralValue = LiteralValue> = {
    readonly value: value
}

/** Supertype of TypeNode used for internal operations that can handle all
 * possible TypeNodes */
export type UnknownNode = supertype<TypeNode, Identifier | UnknownResolution>

export type UnknownResolution = {
    readonly [k in TypeName]?: UnknownConstraints
}

export type UnknownConstraints =
    | true
    | listable<Identifier | UnknownKeyedConstraint>

export type UnknownResolvedConstraints = true | listable<UnknownKeyedConstraint>

export type UnknownKeyedConstraint = UnknownAttributes | PrimitiveLiteral

export type UnknownAttributes = replaceKeys<
    Attributes,
    {
        props: Dictionary<UnknownNode>
        propTypes: UnknownPropTypesAttribute
    }
>

type UnknownPropTypesAttribute = {
    readonly number?: UnknownNode
    readonly string?: UnknownNode
}
