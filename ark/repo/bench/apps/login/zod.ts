import * as z from "zod"

export const Login = z.object({
	email: z.email(),
	password: z.string().min(8).max(64)
})
