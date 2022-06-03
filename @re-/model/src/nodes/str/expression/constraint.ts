import { ElementOf, Spliterate } from "@re-/tools"
import { ParseErrorMessage } from "../../../errors.js"
import { EmbeddedNumberLiteral } from "../embeddedLiteral/embeddedNumberLiteral.js"
import { numberKeywords, stringKeywords } from "../keyword/index.js"
import { Str } from "../str.js"

export const getComparables = () => [...numberKeywords, ...stringKeywords]

export type Comparable = ElementOf<ReturnType<typeof getComparables>>

export type ComparatorToken = "<=" | ">=" | "<" | ">"

type InvalidBoundError<
    Inner extends string,
    Limit extends string
> = `'${Limit}' must be a number literal to bound '${Inner}'.`

type UnboundableError<Bounded extends string> =
    `Bounded definition '${Bounded}' must be a number or string keyword.`

const constraintErrorTemplate =
    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."

type ConstraintError = typeof constraintErrorTemplate

export namespace Constraint {
    export type Definition = `${string}${ComparatorToken}${string}`

    export type Parse<
        Def extends string,
        Dict,
        Ctx,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends ParseErrorMessage
        ? Bounded
        : Str.Parse<Bounded, Dict, Ctx>

    export type Validate<
        Def extends string,
        Dict,
        Root,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends ParseErrorMessage
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
        ? Middle extends Comparable
            ? Left extends EmbeddedNumberLiteral.Definition
                ? Right extends EmbeddedNumberLiteral.Definition
                    ? Middle
                    : ParseErrorMessage<InvalidBoundError<Middle, Right>>
                : ParseErrorMessage<InvalidBoundError<Middle, Left>>
            : ParseErrorMessage<UnboundableError<Middle>>
        : Parts extends SingleBoundedParts<
              infer Left,
              ComparatorToken,
              infer Right
          >
        ? Left extends Comparable
            ? Right extends EmbeddedNumberLiteral.Definition
                ? Left
                : ParseErrorMessage<InvalidBoundError<Left, Right>>
            : ParseErrorMessage<UnboundableError<Left>>
        : ParseErrorMessage<ConstraintError>

    export const matcher = /(<=|>=|<|>)/
}
