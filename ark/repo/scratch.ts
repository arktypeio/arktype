import { type } from "arktype"

const user = type({
	name: "string",
	age: "number"
})

const keys = user.props.map(p => p.key)
//    ^? ("name" | "age")[]
