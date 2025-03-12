import { type } from "arktype"

const user = type({
	name: "string",
	isAdmin: "boolean = false",
	"age?": "number"
})

const defaultableProps = user.props.filter(
	p => p.kind === "optional" && "default" in p
)

const nanToNull = type("number.NaN").pipe(() => null, type.null)

const nullNumber = type("number").or(nanToNull)

const out = nullNumber(5) // 5
const out2 = nullNumber(Number.NaN) // null

console.log(nullNumber.out.distribute(branch => branch.expression)) // ["number", "null"]
