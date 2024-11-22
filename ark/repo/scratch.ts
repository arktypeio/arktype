import { type } from "arktype"

const _user = type({
	name: "string | undefined"
})

interface User extends type.infer<typeof _user> {}

const user: type<User> = _user

user({}).toString()
