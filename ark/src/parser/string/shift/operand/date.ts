import { throwParseError } from "../../../../../this/utils/src/errors.js"
import { tryParseWellFormedNumber } from "../../../../../this/utils/src/main.js"

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export const isDateLiteral = (value: unknown): value is DateLiteral =>
	typeof value === "string" &&
	value[0] === "d" &&
	(value[1] === "'" || value[1] === '"') &&
	value.at(-1) === value[1]

export const isValidDate = (d: Date) => d.toString() !== "Invalid Date"

export const extractDateLiteralSource = <literal extends DateLiteral>(
	literal: literal
) => literal.slice(2, -1) as extractDateLiteralSource<literal>

type extractDateLiteralSource<literal extends DateLiteral> =
	literal extends DateLiteral<infer source> ? source : never

export const writeInvalidDateMessage = <source extends string>(
	source: source
): writeInvalidDateMessage<source> =>
	`'${source}' could not be parsed by the Date constructor`

export type writeInvalidDateMessage<source extends string> =
	`'${source}' could not be parsed by the Date constructor`

export type DateInput = ConstructorParameters<typeof Date>[0]

export const tryParseDate = <errorOnFail extends boolean | string>(
	source: string,
	errorOnFail?: errorOnFail
) => maybeParseDate(source, errorOnFail)

const maybeParseDate = <errorOnFail extends boolean | string>(
	source: string,
	errorOnFail?: errorOnFail
): Date | (errorOnFail extends true | string ? never : undefined) => {
	const stringParsedDate = new Date(source)
	if (isValidDate(stringParsedDate)) {
		return stringParsedDate
	}
	const epochMillis = tryParseWellFormedNumber(source)
	if (epochMillis !== undefined) {
		const numberParsedDate = new Date(epochMillis)
		if (isValidDate(numberParsedDate)) {
			return numberParsedDate
		}
	}
	return errorOnFail
		? throwParseError(
				errorOnFail === true ? writeInvalidDateMessage(source) : errorOnFail
		  )
		: (undefined as never)
}
