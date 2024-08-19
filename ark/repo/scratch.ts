import { generic, type } from "arktype"

const fooIntoBox = generic([
	"t",
	{
		foo: "number"
	}
])({ boxOf: "t" })

export const good = fooIntoBox({
	foo: "number"
})

const bad = fooIntoBox({
	foo: "string"
})

const d = type("<t>", {
	box: "t"
})

const ttt = d({
	inner: "5"
})
