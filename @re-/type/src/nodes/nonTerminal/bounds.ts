import { Entry } from "@re-/tools"
import { Base } from "../base/index.js"
import { CoreParser } from "../parser/core.js"
import { Shift } from "../parser/shift.js"
import { ParserState } from "../parser/state.js"
import { ParseTree } from "../parser/tree.js"
import type { Keyword, NumberLiteralDefinition } from "../terminal/index.js"
import { NonTerminal } from "./nonTerminal.js"

// const invalidBoundError = (bound: string) =>
//     `Bounding value '${Base.defToString(bound)}' must be a number literal.`

const unboundableError = (inner: string) =>
    `Definition '${Base.defToString(inner)}' is not boundable.`

// const boundPartsErrorTemplate =
//     "Bounds must be either of the form D<N or N<D<N, where 'D' is a boundable definition, 'N' is a number literal, and '<' is a comparison token."

// const invertComparator = (token: ComparatorToken): ComparatorToken => {
//     switch (token) {
//         case "<=":
//             return ">="
//         case ">=":
//             return "<="
//         case "<":
//             return ">"
//         case ">":
//             return "<"
//         case "==":
//             return "=="
//     }
// }

export namespace Bounds {
    export type Token = "<=" | ">=" | "<" | ">" | "=="

    export type StartChar = "<" | ">" | "="

    export type State = {
        left?: [NumberLiteralDefinition, Token]
        right?: [Token, NumberLiteralDefinition]
    }

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100>alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    export type Boundable =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

    export type ShiftToken<
        Start extends StartChar,
        Unscanned extends string[]
    > = Unscanned extends Shift.Scan<infer Lookahead, infer Rest>
        ? Lookahead extends "="
            ? ParserState.RightFrom<{
                  lookahead: `${Start}=`
                  unscanned: Rest
              }>
            : Start extends "="
            ? Shift.Error<`= is not a valid comparator. Use == instead.`>
            : ParserState.RightFrom<{
                  lookahead: Start
                  unscanned: Unscanned
              }>
        : Shift.Error<`Expected a bound condition after ${Start}.`>

    export type ParseLeft<
        S extends ParserState.State,
        T extends Token,
        N extends NumberLiteralDefinition,
        Dict
    > = ParserState.From<{
        L: {
            tree: ParserState.InitialTree
            ctx: S["L"]["ctx"] & {
                bounds: {
                    left: [N, T]
                }
            }
        }
        R: Shift.Base<S["R"]["unscanned"], Dict>
    }>

    export type ParseRight<
        S extends ParserState.State,
        T extends Token,
        N extends NumberLiteralDefinition
    > = ParserState.From<{
        L: {
            tree: S["L"]["tree"]
            ctx: S["L"]["ctx"] & {
                bounds: {
                    right: [T, N]
                }
            }
        }
        R: Shift.Operator<S["R"]["unscanned"]>
    }>

    export type ParsePossibleRightBound<
        S extends ParserState.State,
        Dict
    > = S["R"]["lookahead"] extends Token
        ? ParseRightBound<
              ParserState.From<{
                  L: S["L"]
                  R: Shift.Base<S["R"]["unscanned"], Dict>
              }>,
              S["R"]["lookahead"]
          >
        : CoreParser.ParseFinalizing<S>

    type ParseRightBound<
        S extends ParserState.State,
        T extends Token
    > = S["R"]["lookahead"] extends NumberLiteralDefinition
        ? CoreParser.ParseFinalizing<ParseRight<S, T, S["R"]["lookahead"]>>
        : ParserState.Error<
              S,
              `Right bound ${S["R"]["lookahead"]} must be a number literal followed only by other suffixes.`
          >

    export type ParsePossibleLeftBound<
        S extends ParserState.State,
        N extends NumberLiteralDefinition,
        Dict
    > = S["R"]["lookahead"] extends Token
        ? CoreParser.ParseMain<ParseLeft<S, S["R"]["lookahead"], N, Dict>, Dict>
        : CoreParser.ParseMain<
              ParserState.From<{
                  L: ParserState.SetRoot<S["L"], N>
                  R: S["R"]
              }>,
              Dict
          >

    export type AssertBoundable<S extends ParserState.State> =
        S["L"]["tree"]["root"] extends Bounds.Boundable
            ? S
            : ParserState.Error<
                  S,
                  `Bounded expression '${ParseTree.ToString<
                      S["L"]["tree"]["root"]
                  >}' must be a number-or-string-typed keyword or a list-typed expression.`
              >
}

export interface Boundable extends Base.Node {
    boundBy?: string
    toBound(value: unknown): number
}

export const isBoundable = (node: Base.Node): node is Boundable =>
    "toBound" in node

export type BoundEntry = Entry<Bounds.Token, number>

export class Node extends NonTerminal<Boundable> {
    private bounds: BoundEntry[] | undefined

    toString() {
        return "Bounds not impelmented.."
    }

    assertBoundable(node: Base.Node | Boundable): asserts node is Boundable {
        if (isBoundable(node)) {
            return
        }
        throw new Error(unboundableError(node.toString()))
    }

    // TODO: Remove this once bounds are converted over
    // eslint-disable-next-line max-lines-per-function
    allows(args: Base.Validation.Args) {
        const boundedNode = this.children
        if (!boundedNode.allows(args)) {
            return false
        }
        const boundedValue = boundedNode.toBound(args.value)
        for (const [comparator, bound] of this.bounds!) {
            const boundDescription = `${bound}${
                boundedNode.boundBy ? " " + boundedNode.boundBy : ""
            }`
            if (comparator === "<=" && boundedValue > bound) {
                return this.addBoundError(
                    "less than or equal to",
                    boundedValue,
                    boundDescription,
                    args
                )
            } else if (comparator === ">=" && boundedValue < bound) {
                return this.addBoundError(
                    "greater than or equal to",
                    boundedValue,
                    boundDescription,
                    args
                )
            } else if (comparator === "<" && boundedValue >= bound) {
                return this.addBoundError(
                    "less than",
                    boundedValue,
                    boundDescription,
                    args
                )
            } else if (comparator === ">" && boundedValue <= bound) {
                return this.addBoundError(
                    "greater than",
                    boundedValue,
                    boundDescription,
                    args
                )
            } else if (comparator === "==" && boundedValue !== bound) {
                return this.addBoundError(
                    // Error message is cleaner without token name for equality check
                    "",
                    boundedValue,
                    boundDescription,
                    args
                )
            }
        }
        return true
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Bounded generation is unsupported."
        )
    }

    private addBoundError(
        comparatorName: string,
        boundedValue: number,
        boundDescription: string,
        args: Base.Validation.Args
    ) {
        args.errors.add(
            args.ctx.path,
            `Must be ${comparatorName} ${boundDescription} (got ${boundedValue}).`
        )
        return false
    }
}
