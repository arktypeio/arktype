import { throwParseError, type nominal } from "@arktype/util"
import { writeUnexpectedCharacterMessage } from "./string/shift/operator/operator.js"
import { Scanner } from "./string/shift/scanner.js"

export type GenericDeclaration<
	name extends string = string,
	params extends string = string
> = `${name}<${params}>`

// we put the error in a tuple so that parseGenericParams always returns a string[]
export type GenericParamsParseError<message extends string = string> = [
	nominal<message, "InvalidGenericParameters">
]

export const parseGenericParams = (def: string) =>
	parseGenericParamsRecurse(new Scanner(def))

export type parseGenericParams<def extends string> = parseParamsRecurse<
	def,
	"",
	[]
> extends infer result extends string[]
	? "" extends result[number]
		? GenericParamsParseError<emptyGenericParameterMessage>
		: result
	: never

export const emptyGenericParameterMessage = `An empty string is not a valid generic parameter name`

export type emptyGenericParameterMessage = typeof emptyGenericParameterMessage

const parseGenericParamsRecurse = (scanner: Scanner): string[] => {
	const param = scanner.shiftUntilNextTerminator()
	if (param === "") {
		throwParseError(emptyGenericParameterMessage)
	}
	scanner.shiftUntilNonWhitespace()
	const nextNonWhitespace = scanner.shift()
	return nextNonWhitespace === ""
		? [param]
		: nextNonWhitespace === ","
			? [param, ...parseGenericParamsRecurse(scanner)]
			: throwParseError(writeUnexpectedCharacterMessage(nextNonWhitespace, ","))
}

type parseParamsRecurse<
	unscanned extends string,
	param extends string,
	result extends string[]
> = unscanned extends `${infer lookahead}${infer nextUnscanned}`
	? lookahead extends ","
		? parseParamsRecurse<nextUnscanned, "", [...result, param]>
		: lookahead extends Scanner.WhiteSpaceToken
			? param extends ""
				? // if the next char is whitespace and we aren't in the middle of a param, skip to the next one
					parseParamsRecurse<Scanner.skipWhitespace<nextUnscanned>, "", result>
				: Scanner.skipWhitespace<nextUnscanned> extends `${infer nextNonWhitespace}${infer rest}`
					? nextNonWhitespace extends ","
						? parseParamsRecurse<rest, "", [...result, param]>
						: GenericParamsParseError<
								writeUnexpectedCharacterMessage<nextNonWhitespace, ",">
							>
					: // params end with a single whitespace character, add the current token
						[...result, param]
			: parseParamsRecurse<nextUnscanned, `${param}${lookahead}`, result>
	: param extends ""
		? result
		: [...result, param]
