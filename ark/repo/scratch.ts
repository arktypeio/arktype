import { flatMorph } from "@ark/util"
import { ark, type } from "arktype"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

// false
// const t = type({ foo: "string" }).extends("Record<string, string>")

flatMorph(ark.internal.resolutions, (k, v) => [k, v])

console.log(Object.keys(ark.internal.resolutions))

const myScope = type.scope({
	id: "string#id",
	user: type({
		// ParseError: 'id' is not resolvable
		id: "id"
	})
})
