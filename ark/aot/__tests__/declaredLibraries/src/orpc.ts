import { os } from "@orpc/server"
import { Account, Signup, types } from "./schemas.ts"

export const signup = os
	.input(Signup)
	.output(Account)
	.handler(({ input }) => ({ id: input.role, email: input.email }))

export const orpcRouter = {
	signup,
	reply: os.input(types.comment).handler(({ input }) => input)
}
