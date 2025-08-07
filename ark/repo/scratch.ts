import { type } from "arktype"

const User = type({
	name: "string",
	age: "number = 0"
})

User
