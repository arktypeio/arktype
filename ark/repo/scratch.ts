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

User
