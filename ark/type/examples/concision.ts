//@ts-nocheck
import type { Infer } from "../type/main.js"
import { type } from "../type/main.js"
import z from "zod"

{
	// @snipStatement:arkUserExpression
	const arkUser = type({
		name: /^ark.*$/ as Infer<`ark${string}`>,
		birthday: ["string", "|>", (s) => new Date(s)],
		"powerLevel?": "1<=number<9000"
	})
}

// @snipStatement:arkUserHelper
const arkUser = type({
	name: /^ark.*$/ as Infer<`ark${string}`>,
	birthday: type("string").morph((s) => new Date(s)),
	"powerLevel?": "1<=number<9000"
})

// @snipStatement:zodUser
const zodUser = z.object({
	name: z.custom<`zod${string}`>(
		(val) => typeof val === "string" && /^zod.*$/.test(val)
	),
	birthday: z.preprocess(
		(arg) => (typeof arg === "string" ? new Date(arg) : undefined),
		z.date()
	),
	powerLevel: z.number().gte(1).lt(9000).optional()
})
