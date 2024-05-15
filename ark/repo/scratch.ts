import { type } from "arktype"

// type Z = Type<{ age: number.default<5> }>

const f = (arg?: string) => {}

const user = type({
	"+": "delete",
	name: "string>10",
	email: "email"
	// age: ["number", "=", 5]
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
