// valibot.dev's login form in Zod 4, as written there, its parse exported like the other forms'
import * as z from "zod"

const LoginSchema = z.object({
	email: z
		.string()
		.min(1, "Please enter your email.")
		.email("The email address is badly formatted."),
	password: z
		.string()
		.min(1, "Please enter your password.")
		.min(8, "Your password must have 8 characters or more.")
})

export const validate = (data: unknown) => LoginSchema.parse(data)
