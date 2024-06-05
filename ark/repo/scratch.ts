import { type, type Type } from "arktype"

const _user = type({
	name: "string",
	platform: "'android' | 'ios'",
	"versions?": "(number | string)[]"
})

type _User = typeof _user.t

interface User extends _User {}

export const user: Type<User> = _user

const out = user({
	name: "Alan Turing",
	platform: "enigma",
	versions: [0, "1", 0n]
})
