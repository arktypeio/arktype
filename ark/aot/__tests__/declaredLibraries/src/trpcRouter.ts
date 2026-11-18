import { initTRPC } from "@trpc/server"
import { Account, Signup, types } from "./schemas.ts"

const t = initTRPC.create()

export const router = t.router({
	signup: t.procedure
		.input(Signup)
		.output(Account)
		.mutation(({ input }) => ({ id: input.role, email: input.email })),
	accounts: t.procedure.output(Account.array()).query(() => []),
	reply: t.procedure.input(types.comment).mutation(({ input }) => input)
})
