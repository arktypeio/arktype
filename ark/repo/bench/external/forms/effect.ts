// valibot.dev's login form in Effect Schema (effect 4): every error (errors: "all"), each check with its message;
// no email check, so Valibot's regex
import { Schema } from "effect"

const emailRegex =
	/^[\w+-]+(?:\.[\w+-]+)*@[\da-zA-Z]+(?:[.-][\da-zA-Z]+)*\.[a-zA-Z]{2,}$/u

const LoginSchema = Schema.Struct({
	email: Schema.String.check(
		Schema.isNonEmpty({ message: "Please enter your email." }),
		Schema.isPattern(emailRegex, {
			message: "The email address is badly formatted."
		})
	),
	password: Schema.String.check(
		Schema.isNonEmpty({ message: "Please enter your password." }),
		Schema.isMinLength(8, {
			message: "Your password must have 8 characters or more."
		})
	)
})

export const validate = Schema.decodeUnknownSync(LoginSchema, { errors: "all" })
