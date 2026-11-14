// valibot.dev's login form with its messages, as arktype writes them
import { type } from "arktype"

const LoginSchema = type({
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

LoginSchema.assert({})
