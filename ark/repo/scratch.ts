import { type } from "arktype"

const user = type({
	name: "string>=5",
	age: "number<100"
})

const parseUser = type("string").pipe(s => JSON.parse(s), user)

const validUser = parseUser(`{ "name": "David", "age": 30 }`) //?
//    ^?

const invalidUser = parseUser(`{ "name": "David" }`)
//    ^?

if (invalidUser instanceof type.errors) {
	console.log(invalidUser.summary)
}
