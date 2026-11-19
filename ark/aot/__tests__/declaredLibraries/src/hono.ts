import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { Account, Signup, types } from "./schemas.ts"

export const app = new Hono()
	.post("/signup", sValidator("json", Signup), c =>
		c.json({ role: c.req.valid("json").role })
	)
	.put("/accounts", sValidator("json", Account), c =>
		c.json(c.req.valid("json"))
	)
	.post("/comments", sValidator("json", types.comment), c => c.text("ok"))

export type App = typeof app
