import { type } from "arktype"

const _user = type({
	name: "string | undefined"
})

interface User extends type.infer<typeof _user> {}

const user: type<User> = _user

user({}).toString()

Date.now()

const tenYearsAgo = new Date()
	.setFullYear(new Date().getFullYear() - 10)
	.valueOf()

const bounded = type({
	dateInTheLast10Years: `${tenYearsAgo} <= Date < ${Date.now()}`
})

Date.now() //?

//?

type.Date.laterThan("")

const out = bounded.assert({
	dateInThePast: new Date(0),
	dateAfter2000: new Date(),
	dateAtOrAfter1970: new Date(0)
})
