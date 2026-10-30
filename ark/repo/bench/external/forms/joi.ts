// valibot.dev's login form in Joi: every error (abortEarly: false), each with its message.
// Joi's browser build has no TLD list, so its docs say to turn the TLD check off there
import Joi from "joi"

const LoginSchema = Joi.object({
	email: Joi.string()
		.required()
		.email({ tlds: { allow: false } })
		.messages({
			"any.required": "Please enter your email.",
			"string.empty": "Please enter your email.",
			"string.email": "The email address is badly formatted."
		}),
	password: Joi.string().required().min(8).messages({
		"any.required": "Please enter your password.",
		"string.empty": "Please enter your password.",
		"string.min": "Your password must have 8 characters or more."
	})
})

export const validate = (data: unknown) => {
	const { value, error } = LoginSchema.validate(data, { abortEarly: false })
	if (error) throw error
	return value
}
