import { isValidDate, throwParseError, tryParseNumber } from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"

export const isDateLiteral = (value: unknown): value is DateLiteral =>
	typeof value === "string" &&
	value[0] === "d" &&
	(value[1] === "'" || value[1] === '"') &&
	value[value.length - 1] === value[1]

export const extractDateLiteralSource = <literal extends DateLiteral>(
	literal: literal
): extractDateLiteralSource<literal> => literal.slice(2, -1) as never

type extractDateLiteralSource<literal extends DateLiteral> =
	literal extends DateLiteral<infer source> ? source : never

export const writeInvalidDateMessage = <source extends string>(
	source: source
): writeInvalidDateMessage<source> =>
	`Date literal '${source}' must be an ISO date like 2025-01-01, an ISO date-time with Z or an offset like 2025-01-01T12:00Z, or epoch milliseconds`

export type writeInvalidDateMessage<source extends string> =
	`Date literal '${source}' must be an ISO date like 2025-01-01, an ISO date-time with Z or an offset like 2025-01-01T12:00Z, or epoch milliseconds`

export type DateInput = ConstructorParameters<typeof Date>[0]

export type DateParseResult<
	errorOnFail extends boolean | string = boolean | string
> = Date | (errorOnFail extends true | string ? never : undefined)

export const tryParseDate = <errorOnFail extends boolean | string>(
	source: string,
	errorOnFail?: errorOnFail
): DateParseResult<errorOnFail> => maybeParseDate(source, errorOnFail)

const maybeParseDate = <errorOnFail extends boolean | string>(
	source: string,
	errorOnFail?: errorOnFail
): DateParseResult<errorOnFail> => {
	const isoParts = isoInstantMatcher.exec(source)
	if (isoParts) {
		const [, year, month = "01", day = "01"] = isoParts
		const stringParsedDate = new Date(source)
		if (isValidDate(stringParsedDate) && isDayOfMonth(+year, +month, +day))
			return stringParsedDate
	} else {
		const epochMillis = tryParseNumber(source)
		if (epochMillis !== undefined) {
			const numberParsedDate = new Date(epochMillis)
			if (isValidDate(numberParsedDate)) return numberParsedDate
		}
	}
	return errorOnFail ?
			throwParseError(
				errorOnFail === true ? writeInvalidDateMessage(source) : errorOnFail
			)
		:	(undefined as never)
}

// a date alone is UTC, but a time without Z or an offset would be local
const isoInstantMatcher =
	/^((?!-0{6})[+-]\d{6}|\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/

const isDayOfMonth = (year: number, month: number, day: number) => {
	const date = new Date(0)
	date.setUTCFullYear(year, month - 1, day)
	return date.getUTCDate() === day
}
