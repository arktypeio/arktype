import {
    asNumber,
    ElementOf,
    isEmpty,
    isNumeric,
    narrow,
    NumericString,
    Spliterate
} from "@re-/tools"
import { numberKeywords, stringKeywords } from "../reference/index.js"
import {
    createParser,
    ParseTypeContext,
    typeDefProxy,
    ParseConfig,
    ConstraintError
} from "./internal.js"
import { Expression } from "../index.js"
import { Fragment } from "../fragment.js"
import { NumberLiteral } from "../reference/literal/numberLiteral.js"
import {
    constraintErrorTemplate,
    invalidBoundError,
    InvalidBoundError,
    ParseResult,
    unboundableError,
    UnboundableError,
    validationError
} from "../internal.js"

export const getComparables = () => [...numberKeywords, ...stringKeywords]

export type Comparable = ElementOf<ReturnType<typeof getComparables>>

export type Bound = NumericString

export type ComparatorToken = "<=" | ">=" | "<" | ">"

export const comparatorInverses = narrow({
    "<=": ">=",
    ">=": "<=",
    "<": ">",
    ">": "<"
})

export type ComparatorInverses = typeof comparatorInverses

const buildComparatorErrorMessage = (
    comparatorError: string,
    value: string,
    bound: number,
    isString: boolean
) => `${value} was ${comparatorError} ${bound}${isString ? " characters" : ""}.`

const comparators: {
    [K in ComparatorToken]: (
        value: string,
        comparable: number,
        bound: number,
        isString: boolean
    ) => string
} = {
    "<=": (value, comparable, bound, isString) =>
        comparable > bound
            ? buildComparatorErrorMessage(
                  "greater than",
                  value,
                  bound,
                  isString
              )
            : "",
    ">=": (value, comparable, bound, isString) =>
        comparable < bound
            ? buildComparatorErrorMessage("less than", value, bound, isString)
            : "",
    "<": (value, comparable, bound, isString) =>
        comparable >= bound
            ? buildComparatorErrorMessage(
                  "greater than or equal to",
                  value,
                  bound,
                  isString
              )
            : "",
    ">": (value, comparable, bound, isString) =>
        comparable <= bound
            ? buildComparatorErrorMessage(
                  "less than or equal to",
                  value,
                  bound,
                  isString
              )
            : ""
}

export namespace Constraint {
    export type Definition<
        Left extends string = string,
        Comparator extends ComparatorToken = ComparatorToken,
        Right extends string = string
    > = `${Left}${Comparator}${Right}`

    type SingleBoundedParts<
        Left extends string = string,
        Comparator extends ComparatorToken = ComparatorToken,
        Right extends string = string
    > = [Left, Comparator, Right]

    type DoubleBoundedParts<
        Left extends string = string,
        FirstComparator extends ComparatorToken = ComparatorToken,
        Middle extends string = string,
        SecondComparator extends ComparatorToken = ComparatorToken,
        Right extends string = string
    > = [Left, FirstComparator, Middle, SecondComparator, Right]

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext,
        Parts extends string[] = Spliterate<Def, ["<=", ">=", "<", ">"], true> &
            string[]
    > = Parts extends DoubleBoundedParts<
        infer Left,
        infer FirstComparator,
        infer Middle,
        infer SecondComparator,
        infer Right
    >
        ? Middle extends Comparable
            ? Left extends NumberLiteral.Definition
                ? Right extends NumberLiteral.Definition
                    ? {
                          bounded: Fragment.Parse<Middle, Space, Context>
                      } & {
                          [K in ComparatorInverses[FirstComparator]]: Left
                      } & {
                          [K in SecondComparator]: Right
                      }
                    : InvalidBoundError<Middle, Right>
                : InvalidBoundError<Middle, Left>
            : UnboundableError<Middle>
        : Parts extends SingleBoundedParts<
              infer Left,
              infer Comparator,
              infer Right
          >
        ? Left extends Comparable
            ? Right extends NumberLiteral.Definition
                ? { bounded: Fragment.Parse<Left, Space, Context> } & {
                      [K in Comparator]: Right
                  }
                : InvalidBoundError<Left, Right>
            : UnboundableError<Left>
        : ConstraintError

    type NodeBounds = {
        [K in ComparatorToken]?: NumberLiteral.Definition
    }

    export type Node = {
        bounded: Fragment.Node
    } & NodeBounds

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
            components: (
                def,
                ctx
            ): { bounded: ParseResult<any> } & NodeBounds => {
                const comparables = getComparables()
                const parts = def.split(matcher)
                if (parts.length === 5) {
                    if (!(parts[1] in comparators && parts[3] in comparators)) {
                        throw new Error(constraintErrorTemplate)
                    }
                    if (!comparables.includes(parts[2] as any)) {
                        throw new Error(unboundableError(parts[2]))
                    }
                    if (!isNumeric(parts[0])) {
                        throw new Error(invalidBoundError(parts[2], parts[0]))
                    }
                    if (!isNumeric(parts[4])) {
                        throw new Error(invalidBoundError(parts[2], parts[4]))
                    }
                    const firstComparator =
                        comparatorInverses[parts[1] as ComparatorToken]
                    const secondComparator = parts[3] as ComparatorToken
                    return {
                        bounded: Fragment.parse(parts[2], ctx) as any,
                        [firstComparator]: parts[0],
                        [secondComparator]: parts[4]
                    }
                }
                if (parts.length === 3) {
                    if (!(parts[1] in comparators)) {
                        throw new Error(constraintErrorTemplate)
                    }
                    if (!comparables.includes(parts[0] as any)) {
                        throw new Error(unboundableError(parts[0]))
                    }
                    if (!isNumeric(parts[2])) {
                        throw new Error(invalidBoundError(parts[0], parts[2]))
                    }
                    const comparator = parts[1] as ComparatorToken
                    return {
                        bounded: Fragment.parse(parts[0], ctx) as any,
                        [comparator]: parts[2]
                    }
                }
                throw new Error(constraintErrorTemplate)
            }
        },
        {
            matches: (def) => matcher.test(def),
            allows: ({ def, components, ctx }, valueType, opts) => {
                const { bounded, ...bounds } = components
                const typeErrors = bounded.allows(valueType)
                if (!isEmpty(typeErrors)) {
                    return typeErrors
                }
                const isString = stringKeywords.includes(bounded.def)
                const comparable = isString
                    ? // String literals include two extra characters for quotes
                      (valueType as string).length - 2
                    : (valueType as number)
                const boundEntries = Object.entries(bounds as NodeBounds)
                for (const [comparator, bound] of boundEntries) {
                    const token = comparator as ComparatorToken
                    const boundError = comparators[token](
                        `${valueType}`,
                        comparable,
                        asNumber(bound, { assert: true }),
                        isString
                    )
                    if (boundError) {
                        return validationError({
                            def,
                            path: ctx.path,
                            message: boundError
                        })
                    }
                }
                return {}
            },
            references: ({ components }) => components.bounded.references(),
            generate: ({ def }) => {
                throw new Error(
                    `Unable to generate a value for '${def}' (generation with constraints is unsupported).`
                )
            }
        }
    )

    export const delegate = parse as any as Definition
}
