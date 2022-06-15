import { Spliterate } from "@re-/tools"
import { EmbeddedNumber } from "./embedded.js"
import { Keyword } from "./keyword.js"
import { Str } from "./str.js"
import { Common } from "#common"

type BoundableKeyword = Keyword.NumberOnly | Keyword.StringOnly

type ComparatorToken = "<=" | ">=" | "<" | ">"

type InvalidBoundError<Bound extends string> =
    `Bound '${Bound}' must be a number literal.`

const invalidBoundError = (bound: string) =>
    `Bound '${Common.stringifyDef(bound)}' must be a number literal.`

type UnboundableError<Bounded extends string> =
    `Bounded definition '${Bounded}' must be a number or string keyword.`

const unboundableError = (inner: string) =>
    `Bounded definition '${Common.stringifyDef(
        inner
    )}' must be a number or string keyword.`

const constraintErrorTemplate =
    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."

type ConstraintError = typeof constraintErrorTemplate

const buildComparatorErrorMessage = (
    comparatorError: string,
    value: string | number,
    bound: number
) => {
    return `${Common.stringifyValue(value)} is ${comparatorError} ${bound}${
        typeof value === "string" ? " characters" : ""
    }.`
}

const comparatorInverses = {
    "<=": ">=",
    ">=": "<=",
    "<": ">",
    ">": "<"
}

const comparators: {
    [K in ComparatorToken]: (
        // The original value whose bounds are being validated
        value: string | number,
        // The value to check against bounds (# of characters for a string, the value itself for a number)
        valueToCompare: number,
        // The bound against which to check valueToCompare
        bound: number
    ) => string
} = {
    "<=": (value, comparable, bound) =>
        comparable > bound
            ? buildComparatorErrorMessage("greater than", value, bound)
            : "",
    ">=": (value, comparable, bound) =>
        comparable < bound
            ? buildComparatorErrorMessage("less than", value, bound)
            : "",
    "<": (value, comparable, bound) =>
        comparable >= bound
            ? buildComparatorErrorMessage(
                  "greater than or equal to",
                  value,
                  bound
              )
            : "",
    ">": (value, comparable, bound) =>
        comparable <= bound
            ? buildComparatorErrorMessage("less than or equal to", value, bound)
            : ""
}

export namespace Constraint {
    export type Definition = `${string}${ComparatorToken}${string}`

    export type Parse<
        Def extends string,
        Dict,
        Ctx,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends Common.Parser.ParseErrorMessage
        ? Bounded
        : Str.Parse<Bounded, Dict, Ctx>

    export type Validate<
        Def extends string,
        Dict,
        Root,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends Common.Parser.ParseErrorMessage
        ? Bounded
        : Str.Validate<Bounded, Dict, Root>

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
        ? Middle extends BoundableKeyword
            ? Left extends EmbeddedNumber.Definition
                ? Right extends EmbeddedNumber.Definition
                    ? Middle
                    : Common.Parser.ParseErrorMessage<InvalidBoundError<Right>>
                : Common.Parser.ParseErrorMessage<InvalidBoundError<Left>>
            : Common.Parser.ParseErrorMessage<UnboundableError<Middle>>
        : Parts extends SingleBoundedParts<
              infer Left,
              ComparatorToken,
              infer Right
          >
        ? Left extends BoundableKeyword
            ? Right extends EmbeddedNumber.Definition
                ? Left
                : Common.Parser.ParseErrorMessage<InvalidBoundError<Right>>
            : Common.Parser.ParseErrorMessage<UnboundableError<Left>>
        : Common.Parser.ParseErrorMessage<ConstraintError>

    const matcher = /(<=|>=|<|>)/

    export const matches = (def: string): def is Definition => matcher.test(def)

    const validateBound = (part: string) => {
        if (!EmbeddedNumber.matches(part)) {
            throw new Error(invalidBoundError(part))
        }
        return EmbeddedNumber.valueFrom(part)
    }

    const boundables = Keyword.getSubtypeHandlers()

    const getBoundableHandler = (part: string) => {
        if (part in boundables.number) {
            return boundables.number[part]
        }
        if (part in boundables.string) {
            return boundables.string[part]
        }
        throw new Error(unboundableError(part))
    }

    type Bounds = {
        [K in ComparatorToken]?: EmbeddedNumber.Definition
    }

    type ParseResult = Bounds & {
        bounded: {
            keyword: BoundableKeyword
            handler: Keyword.Handler
        }
    }

    export class Node extends Common.Branch<Definition, ParseResult> {
        parse() {
            // Odd-indexed parts will always be comparators (<=, >=, < or >)
            // We still need to validate even-indexed parts as boundable keywords or number literals
            const parts = this.def.split(matcher)
            if (parts.length === 5) {
                return {
                    bounded: {
                        keyword: parts[2],
                        handler: getBoundableHandler(parts[2])
                    },
                    /** We have to take the inverse of the first comparator in an expression like
                     * 5<=number<10
                     * so that it can be split into two expressions like
                     * number>=5
                     * number<10
                     */
                    [comparatorInverses[parts[1] as ComparatorToken]]:
                        validateBound(parts[0]),
                    [parts[3]]: validateBound(parts[4])
                } as ParseResult
            }
            if (parts.length === 3) {
                return {
                    bounded: {
                        keyword: parts[0],
                        handler: getBoundableHandler(parts[0])
                    },
                    [parts[1]]: validateBound(parts[2])
                } as ParseResult
            }
            throw new Error(constraintErrorTemplate)
        }

        allows(args: Common.Allows.Args) {
            const { bounded, ...bounds } = this.next()
            if (!bounded.handler.validate(args.value, this.ctx)) {
                args.errors.set(
                    args.ctx.path,
                    `${Common.stringifyValue(
                        args.value
                    )} is not assignable to ${bounded.keyword}.`
                )
                return
            }
            const boundEntries = Object.entries(bounds) as [
                ComparatorToken,
                number
            ][]
            for (const [comparator, bound] of boundEntries) {
                const boundError = comparators[comparator](
                    args.value as string | number,
                    typeof args.value === "string"
                        ? args.value.length
                        : (args.value as number),
                    bound
                )
                if (boundError) {
                    args.errors.set()
                    this.addCustomUnassignable(args, boundError)
                    return
                }
            }
        }

        generate() {
            throw new Common.UngeneratableError(
                this.def,
                "Constraint generation is unsupported."
            )
        }
    }
}
