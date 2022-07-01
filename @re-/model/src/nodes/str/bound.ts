import { Entry, Spliterate } from "@re-/tools"
import { Base } from "./base.js"
import { EmbeddedNumber } from "./embedded.js"
import { Keyword } from "./keyword/index.js"
import { List } from "./list.js"
import { Str } from "./str.js"

type BoundableKeyword =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | List.Definition

type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="

type InvalidBoundError<Bound extends string> =
    `Bound '${Bound}' must be a number literal.`

const invalidBoundError = (bound: string) =>
    `Bound '${Base.defToString(bound)}' must be a number literal.`

type UnboundableError<Bounded extends string> =
    `Bounded definition '${Bounded}' must be a number or string keyword.`

const unboundableError = (inner: string) =>
    `Bounded definition '${Base.defToString(
        inner
    )}' must be a number or string keyword.`

const constraintErrorTemplate =
    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."

type ConstraintError = typeof constraintErrorTemplate

const invertComparator = (token: ComparatorToken): ComparatorToken => {
    switch (token) {
        case "<=":
            return ">="
        case ">=":
            return "<="
        case "<":
            return ">"
        case ">":
            return "<"
        case "==":
            return "=="
    }
}

export namespace Bound {
    export type Definition = `${string}${ComparatorToken}${string}`

    export interface Boundable extends Base.Parsing.Node {
        boundBy?: string
        toBound(value: unknown): number
    }

    export type Parse<
        Def extends string,
        Dict,
        Ctx,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends Base.Parsing.ParseErrorMessage
        ? Bounded
        : Str.Parse<Bounded, Dict, Ctx>

    export type Validate<
        Def extends string,
        Dict,
        Root,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends Base.Parsing.ParseErrorMessage
        ? Bounded
        : Str.Validate<Bounded, Dict, Root>

    export type References<
        Def extends string,
        Filter
    > = Str.RecursiveReferences<ExtractBounded<Def>, Filter>

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
        Parts = Spliterate<Def, ["<=", ">=", "<", ">", "=="], true>
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
                    : Base.Parsing.ParseErrorMessage<InvalidBoundError<Right>>
                : Base.Parsing.ParseErrorMessage<InvalidBoundError<Left>>
            : Base.Parsing.ParseErrorMessage<UnboundableError<Middle>>
        : Parts extends SingleBoundedParts<
              infer Left,
              ComparatorToken,
              infer Right
          >
        ? Left extends BoundableKeyword
            ? Right extends EmbeddedNumber.Definition
                ? Left
                : Base.Parsing.ParseErrorMessage<InvalidBoundError<Right>>
            : Base.Parsing.ParseErrorMessage<UnboundableError<Left>>
        : Base.Parsing.ParseErrorMessage<ConstraintError>

    const matcher = /(<=|>=|<|>|==)/

    export const matches = (def: string): def is Definition => matcher.test(def)

    const valueFromBoundPart = (part: string) => {
        if (!EmbeddedNumber.matches(part)) {
            throw new Error(invalidBoundError(part))
        }
        return EmbeddedNumber.valueFrom(part)
    }

    export type BoundEntry = Entry<ComparatorToken, number>

    type BoundParts = [string, ComparatorToken, string]
    type RangeParts = [string, ComparatorToken, string, ComparatorToken, string]

    export class Node extends Base.Branch<Definition, Boundable[]> {
        private bounds: BoundEntry[] = []

        parse() {
            // The regex guarantees odd-indexed parts are comparators (<=, >=, < or >)
            const parts = this.def.split(matcher)
            let child
            // Delegate validation of the bounded definition and bound values
            if (parts.length === 3) {
                child = this.parseBound(parts as BoundParts)
            } else if (parts.length === 5) {
                child = this.parseRange(parts as RangeParts)
            } else {
                throw new Error(constraintErrorTemplate)
            }
            this.assertBoundable(child)
            return [child]
        }

        // E.g. ["number", ">=", "5"]
        private parseBound(parts: BoundParts) {
            this.bounds.push([parts[1], valueFromBoundPart(parts[2])])
            return Str.parse(parts[0], this.ctx)
        }

        // E.g. ["5", "<", "string", "<=", "20"]
        private parseRange(parts: RangeParts) {
            /** We have to invert the first comparator in an expression like
             * 5<=number<10
             * so that it can be split into two expressions like
             * number>=5
             * number<10
             */
            this.bounds.push(
                [invertComparator(parts[1]), valueFromBoundPart(parts[0])],
                [parts[3], valueFromBoundPart(parts[4])]
            )
            return Str.parse(parts[2], this.ctx)
        }

        private assertBoundable(
            node: Base.Parsing.Node | Boundable
        ): asserts node is Boundable {
            if ("toBound" in node) {
                return
            }
            throw new Error(unboundableError(node.defToString()))
        }

        private addBoundErrorAndReturnFalse(
            comparatorName: string,
            boundDescription: string,
            args: Base.Validation.Args
        ) {
            args.errors.add(
                args.ctx.path,
                `${Base.stringifyValue(
                    args.value
                )} must be ${comparatorName} ${boundDescription}.`
            )
            return false
        }

        allows(args: Base.Validation.Args) {
            const boundedNode = this.firstChild()
            if (!boundedNode.allows(args)) {
                return false
            }
            const boundedValue = boundedNode.toBound(args.value)
            const boundDescription = `${boundedValue}${
                boundedNode.boundBy ? " " + boundedNode.boundBy : ""
            }`
            for (const [comparator, bound] of this.bounds) {
                if (comparator === "<=" && boundedValue > bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "less than or equal to",
                        boundDescription,
                        args
                    )
                } else if (comparator === ">=" && boundedValue < bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "greater than or equal to",
                        boundDescription,
                        args
                    )
                } else if (comparator === "<" && boundedValue >= bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "less than",
                        boundDescription,
                        args
                    )
                } else if (comparator === ">" && boundedValue <= bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "greater than",
                        boundDescription,
                        args
                    )
                } else if (comparator === "==" && boundedValue !== bound) {
                    return this.addBoundErrorAndReturnFalse(
                        // Error message is clear without token name for equality check
                        "",
                        boundDescription,
                        args
                    )
                }
            }
            return true
        }

        generate() {
            throw new Base.Generation.UngeneratableError(
                this.def,
                "Constraint generation is unsupported."
            )
        }
    }
}
