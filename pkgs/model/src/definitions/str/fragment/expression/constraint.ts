import { NumericString, Spliterate } from "@re-/tools"
import { NumberKeyword, StringKeyword } from "../reference/index.js"
import {
    createParser,
    ParseTypeContext,
    UnknownTypeError,
    typeDefProxy,
    ParseConfig
} from "./internal.js"
import { Expression } from "../index.js"
import { Fragment } from "../fragment.js"
import { NumberLiteral } from "../reference/literal/numberLiteral.js"
import { DefaultParseTypeContext } from "../internal.js"

export type Comparable = NumberKeyword | StringKeyword

export type Bound = NumericString

export type Comparator = "<=" | ">=" | "<" | ">"

export type ComparatorInverses = {
    "<=": ">="
    ">=": "<="
    "<": ">"
    ">": "<"
}

// number<5
// 3<number<5

export namespace Constraint {
    export type Definition<
        Left extends string = string,
        Token extends Comparator = Comparator,
        Right extends string = string
    > = `${Left}${Token}${Right}`

    type SingleBoundedParts<
        Left extends string = string,
        Token extends Comparator = Comparator,
        Right extends string = string
    > = [Left, Token, Right]

    type DoubleBoundedParts<
        Left extends string = string,
        FirstToken extends Comparator = Comparator,
        Middle extends string = string,
        SecondToken extends Comparator = Comparator,
        Right extends string = string
    > = [Left, FirstToken, Middle, SecondToken, Right]

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext,
        Parts extends string[] = Spliterate<Def, ["<=", ">=", "<", ">"], true> &
            string[]
    > = Parts extends SingleBoundedParts<infer Left, infer Token, infer Right>
        ? Node<Fragment.Parse<Left, Space, Context>, { [K in Token]: Right }>
        : Parts extends DoubleBoundedParts<
              infer Left,
              infer FirstToken,
              infer Middle,
              infer SecondToken,
              infer Right
          >
        ? Node<
              Fragment.Parse<Middle, Space, Context>,
              { [K in ComparatorInverses[FirstToken]]: Left } & {
                  [K in SecondToken]: Right
              }
          >
        : UnknownTypeError<Def>

    type NodeBounds = {
        [K in Comparator]?: NumberLiteral.Definition
    }

    export type Node<
        Bounded extends Fragment.Node = Fragment.Node,
        Bounds extends NodeBounds = NodeBounds
    > = { bounded: Bounded } & Bounds

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig
    > = Fragment.TypeOf<N["bounded"], Space, Options>

    export const matcher = /(<=|>=|<|>)/

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Expression.parse,
            components: (def, ctx) => {
                const parts = def.split(matcher)
                if (parts.length === 5) {
                }
            }
        },
        {
            matches: (def) => matcher.test(def),
            allows: ({ def, components, ctx }, valueType, opts) => {
                const comparators: Record<
                    string,
                    (left: number, right: number) => string
                > = {
                    "<=": (left, right) =>
                        left > right
                            ? `${left} must be less than or equal to ${right}.`
                            : "",
                    ">=": (left, right) =>
                        left < right
                            ? `${left} must be greater than or equal to ${right}.`
                            : "",
                    "<": (left, right) =>
                        left >= right
                            ? `${left} must be less than ${right}.`
                            : "",
                    ">": (left, right) =>
                        left <= right
                            ? `${left} must be greater than ${right}.`
                            : ""
                }

                for (let index = 1; index < components.length; index += 2) {
                    const comparator = components[index]
                    const toComparable = (comparedValue: string) => {
                        if (comparedValue === "n") {
                            return valueType as number
                        }
                        const comparable = asNumber(comparedValue, {
                            asFloat: true
                        })
                        if (comparable === null) {
                            return `Unable to parse a numeric value from '${comparedValue}' in comparison '${part}'.`
                        }
                        return comparable
                    }
                    const left = toComparable(components[index - 1])
                    const right = toComparable(components[index + 1])
                    // If to comparable returns a string for the left or right side of the comparison, it is an invalid comparison
                    // TODO: Catch this when a model is defined, not when it is used for validation
                    if (typeof left === "string") {
                        return left
                    }
                    if (typeof right === "string") {
                        return right
                    }
                    comparisonErrorMessage += comparators[comparator](
                        left,
                        right
                    )
                }
                return message
            },
            generate: () => {},
            references: () => []
        }
    )

    export const delegate = parse as any as Definition
}
