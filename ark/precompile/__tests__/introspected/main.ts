import { type } from "arktype"
import { User } from "./user.ts"

const Point = type({ x: "number", y: "number" })

const json = User.json
const readJson = () => User.json
// not a static helper, so the validator's own toJsonSchema() runs
const schemaOf = (t: typeof User) => {
	const schema = t.toJsonSchema()
	return schema
}

console.log(
	JSON.stringify([
		json,
		User.toJSON() === json,
		readJson() === json,
		User.toJsonSchema(),
		User.toJsonSchema({ target: "draft-07" }),
		Point.toJSON(),
		Point.toJsonSchema() === Point.toJsonSchema(),
		schemaOf(User)
	])
)
