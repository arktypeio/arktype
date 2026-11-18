import { initTRPC } from "@trpc/server"
import { type } from "arktype"

export const User = type({ name: "string", age: "number" })

const t = initTRPC.create()

export const appRouter = t.router({
	createUser: t.procedure
		.input(User)
		.mutation(({ input }) => ({ message: `Created ${input.name}` }))
})

export type AppRouter = typeof appRouter
