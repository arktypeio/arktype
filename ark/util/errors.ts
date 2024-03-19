export class InternalArktypeError extends Error {}

export const throwInternalError: (message: string) => never = (message) =>
	throwError(message, InternalArktypeError)

export const throwError: (
	message: string,
	constructor?: new (message: string) => Error
) => never = (message, constructor = Error) => {
	throw new constructor(message)
}

export class ParseError extends Error {
	name = "ParseError"
}

export const throwParseError: (message: string) => never = (message) =>
	throwError(message, ParseError)

// Using "Hair Space" as a non-rendered sentinel for an error message string:
// https://www.compart.com/en/unicode/U+200A
// eslint-disable-next-line no-irregular-whitespace
export type ZeroWidthSpace = " "

export type ErrorMessage<message extends string = string> =
	`${message}${ZeroWidthSpace}`

export type Completion<text extends string = string> =
	`${text}${ZeroWidthSpace}${ZeroWidthSpace}`
