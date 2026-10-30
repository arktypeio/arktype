// valibot.dev's login form in TypeBox 0.34, compiled with TypeCompiler; messages through SetErrorFunction,
// keyed by path and error type as TypeBox's docs show; email registered as a format with Valibot's regex
import { FormatRegistry, Type } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import {
	DefaultErrorFunction,
	SetErrorFunction,
	ValueErrorType
} from "@sinclair/typebox/errors"

FormatRegistry.Set("email", value =>
	/^[\w+-]+(?:\.[\w+-]+)*@[\da-zA-Z]+(?:[.-][\da-zA-Z]+)*\.[a-zA-Z]{2,}$/u.test(
		value
	)
)

SetErrorFunction(
	error =>
		error.schema.errorMessage?.[error.errorType] ?? DefaultErrorFunction(error)
)

const LoginSchema = Type.Object({
	email: Type.String({
		minLength: 1,
		format: "email",
		errorMessage: {
			[ValueErrorType.StringMinLength]: "Please enter your email.",
			[ValueErrorType.StringFormat]: "The email address is badly formatted."
		}
	}),
	password: Type.Intersect([
		Type.String({
			minLength: 1,
			errorMessage: {
				[ValueErrorType.StringMinLength]: "Please enter your password."
			}
		}),
		Type.String({
			minLength: 8,
			errorMessage: {
				[ValueErrorType.StringMinLength]:
					"Your password must have 8 characters or more."
			}
		})
	])
})

const C = TypeCompiler.Compile(LoginSchema)

export const validate = (data: unknown) => {
	if (C.Check(data)) return data
	throw new Error([...C.Errors(data)].map(e => e.message).join("\n"))
}
