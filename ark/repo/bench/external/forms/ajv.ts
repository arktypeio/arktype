// valibot.dev's login form as JSON Schema, for ajv's standalone code with ajv-errors' messages: every error
// (allErrors), the two checks per field under allOf so each keeps its own message
export const schema = {
	type: "object",
	properties: {
		email: {
			type: "string",
			allOf: [
				{ minLength: 1, errorMessage: "Please enter your email." },
				{
					format: "email",
					errorMessage: "The email address is badly formatted."
				}
			]
		},
		password: {
			type: "string",
			allOf: [
				{ minLength: 1, errorMessage: "Please enter your password." },
				{
					minLength: 8,
					errorMessage: "Your password must have 8 characters or more."
				}
			]
		}
	},
	required: ["email", "password"]
}
