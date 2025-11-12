import { throwParseError, tryParseNumber } from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"

export const isDateLiteral = (value: unknown): value is DateLiteral =>
	typeof value === "string" &&
	value[0] === "d" &&
	(value[1] === "'" || value[1] === '"') &&
	value[value.length - 1] === value[1]

export const isValidDate = (d: Date): boolean => d.toString() !== "Invalid Date"

export const extractDateLiteralSource = <literal extends DateLiteral>(
	literal: literal
): extractDateLiteralSource<literal> => literal.slice(2, -1) as never

type extractDateLiteralSource<literal extends DateLiteral> =
	literal extends DateLiteral<infer source> ? source : never

export const writeInvalidDateMessage = <source extends string>(
	source: source
): writeInvalidDateMessage<source> =>
	`'${source}' could not be parsed by the Date constructor`

export type writeInvalidDateMessage<source extends string> =
	`'${source}' could not be parsed by the Date constructor`

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
	const stringParsedDate = new Date(source)
	if (isValidDate(stringParsedDate)) return stringParsedDate

	const epochMillis = tryParseNumber(source)
	if (epochMillis !== undefined) {
		const numberParsedDate = new Date(epochMillis)
		if (isValidDate(numberParsedDate)) return numberParsedDate
	}
	return errorOnFail ?
			throwParseError(
				errorOnFail === true ? writeInvalidDateMessage(source) : errorOnFail
			)
		:	(undefined as never)
}
