export const Login = {
	$id: "Login",
	type: "object",
	properties: {
		email: { type: "string", format: "email" },
		password: { type: "string", minLength: 8, maxLength: 64 }
	},
	required: ["email", "password"]
}
