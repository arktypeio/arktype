import { isDate } from "node:util/types"
import { throwParseError } from "../../../../../dev/utils/src/errors.js"
import type { RangeNode } from "../../../../nodes/primitive/range.js"
import { writeIncompatibleLimitMessage } from "../../../../nodes/primitive/range.js"

export type DateLiteral<value extends string = string> =
    | `d"${value}"`
    | `d'${value}'`

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const hasDateEnclosing = (s: unknown): s is DateLiteral =>
    /^d/.test(s as DateLiteral)

export const extractDate = (s: string) => s.slice(2, -1)

export const writeInvalidDateMessage = <s extends string>(
    s: s
): writeInvalidDateMessage<s> => `new Date(${s}) resulted in an Invalid Date`

export type writeInvalidDateMessage<s extends string> =
    `new Date(${s}) resulted in an Invalid Date`

export type DateInput = ConstructorParameters<typeof Date>[0]

export const tryParseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
) => parseDate(token, errorOnFail)

const parseDate = <ErrorOnFail extends boolean | string>(
    token: string,
    errorOnFail?: ErrorOnFail
): ErrorOnFail extends true | string ? Date : Date | undefined => {
    const date = new Date(extractDate(token))
    if (isValidDate(date)) {
        return date
    }
    return (
        errorOnFail
            ? throwParseError(
                  errorOnFail === true
                      ? writeInvalidDateMessage(token)
                      : errorOnFail
              )
            : undefined
    ) as any
}

export const assertNonMismatchLimits = (rangeNode: RangeNode) =>
    rangeNode.rule.length === 1
        ? isDate(rangeNode.rule[0].limit)
            ? "date"
            : "number"
        : isDate(rangeNode.rule[0].limit) && isDate(rangeNode.rule[1].limit)
        ? "date"
        : typeof rangeNode.rule[0].limit === "number" &&
          typeof rangeNode.rule[1].limit === "number"
        ? "number"
        : throwParseError(
              writeIncompatibleLimitMessage(
                  typeof rangeNode.rule[0],
                  typeof rangeNode.rule[1]
              )
          )
