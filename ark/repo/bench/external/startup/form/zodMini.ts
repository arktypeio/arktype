// login/zodMini.ts's form, which throws at its first parse as valibot.dev
// writes it (z.check takes no schema), written so it runs
import * as z from "zod/mini"

export const LoginSchema = z.object({
	email: z
		.email("The email address is badly formatted.")
		.check(z.minLength(1, "Please enter your email.")),
	password: z
		.string()
		.check(
			z.minLength(1, "Please enter your password."),
			z.minLength(8, "Your password must have 8 characters or more.")
		)
})
