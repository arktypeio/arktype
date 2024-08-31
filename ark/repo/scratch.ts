import { type } from "arktype"

const arkBox = type.generic([
	"t",
	{
		ark: "number"
	}
])({ boxOf: "t" })

const instantiated = arkBox({
	ark: "number <= 10"
})

console.log(instantiated.expression)

arkBox({
	ark: "string"
})
