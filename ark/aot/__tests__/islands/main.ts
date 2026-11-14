import "./config.ts"
import { type } from "arktype"
import { withId } from "./helpers.ts"

const User = type({ name: "string" })

const kind = process.argv.length > 99 ? "number" : "string"

// @ark-runtime
const Shaped = type({ s: kind })

// @ark-runtime
const Identified = withId({ s: kind })

const samples: [(data: unknown) => unknown, unknown][] = [
	[User, { name: 5 }],
	[Shaped, { s: 1 }],
	[Shaped, { s: "a" }],
	[Identified, { id: "1234", s: "a" }]
]

console.log(
	JSON.stringify(
		samples.map(([validate, data]) => {
			const out = validate(data)
			// what a standalone validator's errors keep of arktype's
			return out instanceof type.errors ?
					out.issues.map(issue => [issue.code, ...issue.path])
				:	out
		})
	)
)
