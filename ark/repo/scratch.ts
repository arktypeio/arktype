import { type } from "arktype"

type({
	foo: "string"
})

export type StandardValidate = (input: unknown, ...rest: object[]) => unknown

// a required prop here should be an error but isn't
const implmementation: StandardValidate = (
	input: unknown,
	required: object
) => {}

/**
 * The validate function interface.
 */
export type StandardValidate = (
	input: unknown,
	// we can type these as `undefined` to ensure implementations at least handle that case- works similarly to `never` but a bit more intuitive
	optionalArg1?: undefined,
	optionalArg2?: undefined,
	optionalArg3?: undefined
) => unknown

// this is okay
const implmementation: StandardValidate = (
	input: unknown,
	optional?: { someKey: string },
	optional2?: string
) => {}

// now fails because of the required arg
const badImplmementation: StandardValidate = (
	input: unknown,
	required: object
) => {}
