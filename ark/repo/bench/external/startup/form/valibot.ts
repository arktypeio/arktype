// login/valibot.ts's form, exported for a handler to read
import * as v from "valibot"

export const LoginSchema = v.object({
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
