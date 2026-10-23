// login/zod.ts's form, exported for a handler to read
import * as z from "zod"

export const LoginSchema = z.object({
	email: z
		.string()
		.min(1, "Please enter your email.")
		.email("The email address is badly formatted."),
	password: z
		.string()
		.min(1, "Please enter your password.")
		.min(8, "Your password must have 8 characters or more.")
})
