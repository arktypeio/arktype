import { type } from "arktype"
import z from "zod"

const Address = z.object({
	streetNumber: z.number(),
	streetName: z.string()
})

const TFromZod = type({
	name: "string",
	age: "number",
	address: Address
})

const valid = TFromZod({ foo: "foo" })
const invalid = TFromZod({ foo: 5 })
