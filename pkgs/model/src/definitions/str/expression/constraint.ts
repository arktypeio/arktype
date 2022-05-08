import {
    asNumber,
    ElementOf,
    isEmpty,
    isNumeric,
    narrow,
    Spliterate,
    toString
} from "@re-/tools"
import { numberKeywords, stringKeywords } from "../reference/index.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"
import { EmbeddedNumberLiteral } from "../reference/embeddedLiteral/embeddedNumberLiteral.js"
import { StringLiteral } from "../reference/embeddedLiteral/stringLiteral.js"
import {
    ParseResult,
    ungeneratableError,
    validationError,
    createParser,
    typeDefProxy,
    ParseError,
    stringifyDefinition
} from "./internal.js"
import { typeOf } from "../../../utils.js"

export const getComparables = () => [...numberKeywords, ...stringKeywords]

export type Comparable = ElementOf<ReturnType<typeof getComparables>>

export type ComparatorToken = "<=" | ">=" | "<" | ">"

export const comparatorInverses = narrow({
    "<=": ">=",
    ">=": "<=",
    "<": ">",
    ">": "<"
})

const buildComparatorErrorMessage = (
    comparatorError: string,
    value: string,
    bound: number,
    isString: boolean
) => {
    const valueIsStringLiteral = StringLiteral.matches(value)
    const formattedValue = toString(
        valueIsStringLiteral ? StringLiteral.valueFrom(value) : value,
        {
            quotes: valueIsStringLiteral ? "single" : "none",
            maxNestedStringLength: 50
        }
    )
    return `${formattedValue} is ${comparatorError} ${bound}${
        isString ? " characters" : ""
    }.`
}

type InvalidBoundError<
    Inner extends string,
    Limit extends string
> = `'${Limit}' must be a number literal to bound '${Inner}'.`

const invalidBoundError = (inner: string, limit: string) =>
    `'${stringifyDefinition(
        limit
    )}' must be a number literal to bound '${stringifyDefinition(inner)}'.`

type UnboundableError<Bounded extends string> =
    `Bounded definition '${Bounded}' must be a number or string keyword.`

const unboundableError = (inner: string) =>
    `Bounded definition '${stringifyDefinition(
        inner
    )}' must be a number or string keyword.`

const constraintErrorTemplate =
    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."

type ConstraintError = typeof constraintErrorTemplate

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
    export type Definition = `${string}${ComparatorToken}${string}`

    export type FastParse<
        Def extends string,
        Dict,
        Ctx,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends ParseError ? Bounded : Str.FastParse<Bounded, Dict, Ctx>

    export type FastValidate<
        Def extends string,
        Dict,
        Root,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends ParseError
        ? Bounded
        : Str.FastValidate<Bounded, Dict, Root>

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

    type ExtractBounded<
        Def extends string,
        Parts = Spliterate<Def, ["<=", ">=", "<", ">"], true>
    > = Parts extends DoubleBoundedParts<
        infer Left,
        ComparatorToken,
        infer Middle,
        ComparatorToken,
        infer Right
    >
        ? Middle extends Comparable
            ? Left extends EmbeddedNumberLiteral.Definition
                ? Right extends EmbeddedNumberLiteral.Definition
                    ? Middle
                    : ParseError<InvalidBoundError<Middle, Right>>
                : ParseError<InvalidBoundError<Middle, Left>>
            : ParseError<UnboundableError<Middle>>
        : Parts extends SingleBoundedParts<
              infer Left,
              ComparatorToken,
              infer Right
          >
        ? Left extends Comparable
            ? Right extends EmbeddedNumberLiteral.Definition
                ? Left
                : ParseError<InvalidBoundError<Left, Right>>
            : ParseError<UnboundableError<Left>>
        : ParseError<ConstraintError>

    type NodeBounds = {
        [K in ComparatorToken]?: EmbeddedNumberLiteral.Definition
    }

    export const matcher = /(<=|>=|<|>)/

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
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
                        bounded: Str.parser.parse(parts[2], ctx) as any,
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
                        bounded: Str.parser.parse(parts[0], ctx) as any,
                        [comparator]: parts[2]
                    }
                }
                throw new Error(constraintErrorTemplate)
            }
        },
        {
            matches: (def) => matcher.test(def),
            validate: ({ def, components, ctx }, value, opts) => {
                const valueType = typeOf(value)
                const { bounded, ...bounds } = components
                const typeErrors = bounded.validate(value, opts)
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
            references: ({ components }) =>
                components.bounded.references() as string[],
            generate: ({ def }) => {
                throw new Error(ungeneratableError(def, "constraint"))
            }
        }
    )

    export const delegate = parser as any as Definition
}
