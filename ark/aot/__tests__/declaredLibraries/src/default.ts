import { initTRPC } from "@trpc/server"
import { Signup } from "./schemas.ts"

const t = initTRPC.create()

export default t.router({
	signup: t.procedure.input(Signup).mutation(({ input }) => input.role)
})
