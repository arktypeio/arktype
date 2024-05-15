import { type } from "arktype"

const user = type({
	name: "string>10",
	email: "email"
})

const out = user({
	name: "test",
	email: ""
})

if (out instanceof type.errors) {
	console.log(out.summary)
} else {
	console.log(out)
}
