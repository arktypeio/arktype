// valibot.dev's login form, as written there: zod/mini's types reject its
// z.check(schema, ...checks), and it throws at its first parse, but this is
// the form valibot.dev sizes. ../startup/form/zodMini.ts runs, within 20 B.
import * as z from "zod/mini"

const LoginSchema = z.object({
	email: z.check(
		z.string(),
		z.minLength(1, "Please enter your email."),
		// @ts-expect-error valibot.dev passes z.check a schema and two checks
		z.email("The email address is badly formatted.")
	),
	password: z.check(
		z.string(),
		z.minLength(1, "Please enter your password."),
		// @ts-expect-error valibot.dev passes z.check a schema and two checks
		z.minLength(8, "Your password must have 8 characters or more.")
	)
})

z.parse(LoginSchema, {})
