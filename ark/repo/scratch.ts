import { type } from "arktype"

const t = type({
	a: "string.date.parse",
	"b?": "number > 5"
})

console.log(t.expression)
