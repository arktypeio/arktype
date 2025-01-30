import "./config.ts"

import { type } from "arktype"

const user = type({
	name: "string",
	email: "string.email"
})

const out = user({
	name: 5,
	email: "449 Canal St"
})

console.log(out.toString())
