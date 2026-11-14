// valibot.dev's login form in Superstruct: refine() is how it attaches a message to a check;
// it has no email check, so Valibot's regex. Every failure via StructError.failures()
import { assert, object, refine, string } from "superstruct"

const emailRegex =
	/^[\w+-]+(?:\.[\w+-]+)*@[\da-zA-Z]+(?:[.-][\da-zA-Z]+)*\.[a-zA-Z]{2,}$/u

const LoginSchema = object({
	email: refine(
		refine(
			string(),
			"nonEmpty",
			value => value.length > 0 || "Please enter your email."
		),
		"email",
		value => emailRegex.test(value) || "The email address is badly formatted."
	),
	password: refine(
		refine(
			string(),
			"nonEmpty",
			value => value.length > 0 || "Please enter your password."
		),
		"minLength",
		value =>
			value.length >= 8 || "Your password must have 8 characters or more."
	)
})

export const validate = (data: unknown) => {
	assert(data, LoginSchema)
	return data
}
