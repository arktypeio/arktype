import { type } from "arktype"

// type-checked, runtime-enforced functions from .ts or .js
const safe = type.fn(
	"string",
	"number = 0.1"
)((name, version) => console.log(`${name}@${version} is safe AF.`))

safe("arktype", 2.2) // "arktype@2.2 is safe AF"

const T = type({
	name: "string > 5",
	flag: "0 | 1"
})
	.array()
	.atLeastLength(1)

// get all references representing literal values
const literals = T.select("unit") // [Type<0>, Type<1>]

// get all references representing literal positive numbers
const positiveNumberLiterals = T.select({
	kind: "unit",
	where: u => typeof u.unit === "number" && u.unit > 0
}) // [Type<1>]

// get all minLength constraints at the root of the Type
const minLengthConstraints = T.select({
	kind: "minLength",
	// the shallow filter excludes the constraint on `name`
	boundary: "shallow"
}) // [MinLengthNode<1>]
