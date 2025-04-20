import type { brand } from "./generics.ts"
import type { CastableBase } from "./records.ts"

export class InternalArktypeError extends Error {}

export const throwInternalError: (message: string) => never = message =>
	throwError(message, InternalArktypeError)

export const throwError: (
	message: string,
	ctor?: new (message: string) => Error
) => never = (message, ctor = Error) => {
	throw new ctor(message)
}

export class ParseError extends Error {
	readonly name = "ParseError"
}

export const throwParseError: (message: string) => never = message =>
	throwError(message, ParseError)

/**
 *  TypeScript won't suggest strings beginning with a space as properties.
 *  Useful for symbol-like string properties.
 */
export const noSuggest = <s extends string>(s: s): noSuggest<s> => ` ${s}`

/**
 *  TypeScript won't suggest strings beginning with a space as properties.
 *  Useful for symbol-like string properties.
 */
export type noSuggest<s extends string = string> = ` ${s}`

/** "Hair Space" character, used  as a non-rendered sentinel for an error message string:
 *  https://www.compart.com/en/unicode/U+200A
 */
export const zeroWidthSpace = " "

/** "Hair Space" character, used  as a non-rendered sentinel for an error message string:
 *  https://www.compart.com/en/unicode/U+200A
 */
export type ZeroWidthSpace = typeof zeroWidthSpace

export type ErrorMessage<message extends string = string> =
	`${message}${ZeroWidthSpace}`

export interface ErrorType<ctx extends {} = {}> extends CastableBase<ctx> {
	[brand]: "ErrorType"
}

export type Completion<text extends string = string> =
	`${text}${ZeroWidthSpace}${ZeroWidthSpace}`
