import { ArkErrors, type } from "arktype"
import * as v from "valibot"
import z from "zod"

const ZodAddress = z.object({
	street: z.string(),
	city: z.string()
})

const User = type({
	name: "string",
	age: v.number(),
	address: ZodAddress
})

const T = type({}).narrow((u, ctx) =>
	ctx.reject({ code: "predicate", meta: { examples: [] } })
)

const out = T({})

if (out instanceof ArkErrors) {
	console.log(out[0].meta)
}

declare global {
	interface ArkEnv {
		meta(): {
			// meta properties should always be optional
			secretIngredient?: string
		}
	}
}
