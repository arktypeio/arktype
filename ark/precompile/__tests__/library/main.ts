import { type } from "arktype"
import { Tagged } from "tagged"

console.log(
	JSON.stringify(
		[{ tag: 5 }, { tag: "a" }].map(data => {
			const out = Tagged(data)
			return out instanceof type.errors ? out.summary : out
		})
	)
)
