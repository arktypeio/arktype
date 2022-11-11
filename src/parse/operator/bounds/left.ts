import { isKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { tryParseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { DynamicState } from "../../state/dynamic.js"
import { Scanner } from "../../state/scanner.js"
import type { InvertedComparators } from "./shared.js"
import {
    buildInvalidDoubleBoundMessage,
    invertedComparators
} from "./shared.js"

export const parseLeftBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) =>
    isKeyOf(comparator, Scanner.pairableComparators)
        ? parseValidated(s, comparator)
        : s.error(buildInvalidDoubleBoundMessage(comparator))

const parseValidated = (s: DynamicState, token: Scanner.PairableComparator) => {
    // s.branches.range = [
    //     tryParseWellFormedNumber(s.root.eject().value, true),
    //     token
    // ]
}

export const buildBoundLiteralMessage = <
    literal extends NumberLiteral,
    limit extends number,
    token extends Scanner.Comparator
>(
    literal: literal,
    limit: limit,
    comparator: token
): buildBoundLiteralMessage<literal, limit, token> =>
    `Literal value '${literal}' cannot be bound by ${limit}${comparator}`

export type buildBoundLiteralMessage<
    literal extends NumberLiteral,
    limit extends number,
    comparator extends Scanner.Comparator
> = `Literal value '${literal}' cannot be bound by ${limit}${comparator}`

export const buildOpenRangeMessage = <
    limit extends number,
    comparator extends Scanner.Comparator
>(
    limit: limit,
    comparator: comparator
): buildOpenRangeMessage<limit, comparator> =>
    `Left bounds are only valid when paired with right bounds (try ...${invertedComparators[comparator]}${limit})`

export type buildOpenRangeMessage<
    limit extends number,
    comparator extends Scanner.Comparator
> = `Left bounds are only valid when paired with right bounds (try ...${InvertedComparators[comparator]}${limit})`
