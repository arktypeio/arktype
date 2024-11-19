import { type } from "arktype"

const _user = type({
	name: "string"
})

interface User extends type.infer<typeof _user> {}

const user: type<User> = _user
const booleans = type({
	a: type.boolean,
	b: type.keywords.true,
	c: type.keywords.true,
	// equivalent to boolean
	d: type.keywords.true.or(type.keywords.false)
})
