// login/arktype.ts's form, exported for a handler to read
import { type } from "arktype"

export const LoginSchema = type({
	email: type("string > 0")
		.configure({ message: "Please enter your email." })
		.and(
			type("string.email").configure({
				message: "The email address is badly formatted."
			})
		),
	password: type("string > 0")
		.configure({ message: "Please enter your password." })
		.and(
			type("string >= 8").configure({
				message: "Your password must have 8 characters or more."
			})
		)
})
