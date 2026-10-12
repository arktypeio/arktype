import { type } from "arktype"
import { pair, piped } from "./helpers.ts"
import { Trimmed, User } from "./user.ts"

const Point = type({ x: "number", y: "number" })

const json = User.json
const readJson = () => User.json
// not a static helper, so the validator's own toJsonSchema() runs
const schemaOf = (t: typeof User) => {
	const schema = t.toJsonSchema()
	return schema
}

const Length = type("string").pipe(s => s.length)
const Big = type("bigint")
// arktype can't write either's JSON Schema, and throws even where nothing reads it
const thrown: string[] = []
try {
	const lengthSchema = Length.toJsonSchema()
} catch (e) {
	thrown.push(String(e))
}
try {
	Big.toJsonSchema()
} catch (e) {
	thrown.push(String(e))
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
		schemaOf(User),
		thrown,
		// a validator lacks `in`, `out` and `props`, so the site receives the Type it reads them off
		Trimmed.in.json,
		Trimmed.out.toJsonSchema(),
		User.props[0].value.expression,
		type({ trimmed: Trimmed.in }).expression,
		// each call selects the variant compiled for its functions' parameter counts
		piped(() => 0)("x"),
		piped(String)("x"),
		piped(parseInt)("12"),
		pair(s => s.length > 1, Math.abs)({ a: "xy", b: -1 }),
		pair(
			(s, ctx) => s.length > 1 || ctx.mustBe("long"),
			() => 0
		)({
			a: "xy",
			b: 1
		})
	])
)
