import { type } from "arktype"

const user = type({
	name: "string",
	isAdmin: "boolean = false",
	"age?": "number"
})

const defaultableProps = user.props.filter(
	p => p.kind === "optional" && "default" in p
)
