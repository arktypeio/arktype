import * as z from "zod/mini"

export const Login = z.object({
	email: z.email(),
	password: z.string().check(z.minLength(8), z.maxLength(64))
})
