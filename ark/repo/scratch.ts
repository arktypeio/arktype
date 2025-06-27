import { type } from "arktype"

const User = type({
	name: "string",
	id: "number#id"
})

User
