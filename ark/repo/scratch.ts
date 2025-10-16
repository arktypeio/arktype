import { type } from "arktype"

const t = type({
	a: "true",
	"a?": "true"
})

console.log(t.expression)
