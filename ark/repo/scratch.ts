import { type } from "../type/index.js"

const palindromicContact = type({
	email: "email",
	score: "integer < 100"
})

const out = palindromicContact({
	email: "david@arktype.io",
	score: 133.7
})

if (out instanceof type.errors) {
	console.error(out.summary)
} else {
	console.log(out.email)
}
