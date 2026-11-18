// valibot.dev's login form, as written there, its parse exported like the other forms'
import * as v from "valibot"

const LoginSchema = v.object({
	email: v.pipe(
		v.string(),
		v.nonEmpty("Please enter your email."),
		v.email("The email address is badly formatted.")
	),
	password: v.pipe(
		v.string(),
		v.nonEmpty("Please enter your password."),
		v.minLength(8, "Your password must have 8 characters or more.")
	)
})

export const validate = (data: unknown) => v.parse(LoginSchema, data)
