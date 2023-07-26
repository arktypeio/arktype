export class InternalArktypeError extends Error {}

export const throwInternalError = (message: string) => {
	throw new InternalArktypeError(message)
}

export class ParseError extends Error {}

export const throwParseError = (message: string) => {
	throw new ParseError(message)
}

// TODO: hair space
export type error<message extends string = string> = `!${message}`
