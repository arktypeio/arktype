// valibot.dev's login form in runtypes: withConstraint returns the message; no email check, so Valibot's regex
import { Object, String } from "runtypes"

const emailRegex =
	/^[\w+-]+(?:\.[\w+-]+)*@[\da-zA-Z]+(?:[.-][\da-zA-Z]+)*\.[a-zA-Z]{2,}$/u

const LoginSchema = Object({
	email: String.withConstraint(
		s => s.length > 0 || "Please enter your email."
	).withConstraint(
		s => emailRegex.test(s) || "The email address is badly formatted."
	),
	password: String.withConstraint(
		s => s.length > 0 || "Please enter your password."
	).withConstraint(
		s => s.length >= 8 || "Your password must have 8 characters or more."
	)
})

export const validate = (data: unknown) => LoginSchema.check(data)
