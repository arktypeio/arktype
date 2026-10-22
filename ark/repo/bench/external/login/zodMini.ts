// valibot.dev's login form, as written there
import * as z from "zod/mini"

const LoginSchema = z.object({
	email: z.check(
		z.string(),
		z.minLength(1, "Please enter your email."),
		z.email("The email address is badly formatted.")
	),
	password: z.check(
		z.string(),
		z.minLength(1, "Please enter your password."),
		z.minLength(8, "Your password must have 8 characters or more.")
	)
})

z.parse(LoginSchema, {})
