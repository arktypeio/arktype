// valibot.dev's login form in Zod Mini, written so it runs (valibot.dev's z.check(schema, ...) throws at its
// first parse), its parse exported like the other forms'
import * as z from "zod/mini"

const LoginSchema = z.object({
	email: z
		.string()
		.check(
			z.minLength(1, "Please enter your email."),
			z.email("The email address is badly formatted.")
		),
	password: z
		.string()
		.check(
			z.minLength(1, "Please enter your password."),
			z.minLength(8, "Your password must have 8 characters or more.")
		)
})

export const validate = (data: unknown) => z.parse(LoginSchema, data)
