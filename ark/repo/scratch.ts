import { type } from "arktype"

const user = type({
	name: "string",
	"age?": "0 <= number < 200"
})

console.log(user.toJsonSchema())

const result = {
	type: "object",
	properties: {
		name: { type: "string" },
		age: { type: "number", exclusiveMaximum: 200, minimum: 0 }
	},
	required: ["name"]
}
