import { type } from "arktype"

export const Login = type({
	email: "string.email",
	password: "8 <= string <= 64"
})
