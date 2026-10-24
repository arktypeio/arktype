// valibot.dev's login form in Yup: every error (abortEarly: false), each with its message
import { object, string } from "yup"

const LoginSchema = object({
	email: string()
		.required("Please enter your email.")
		.email("The email address is badly formatted."),
	password: string()
		.required("Please enter your password.")
		.min(8, "Your password must have 8 characters or more.")
})

export const validate = (data: unknown) =>
	LoginSchema.validateSync(data, { abortEarly: false })
