import { type } from "arktype"
import { Tagged } from "tagged"

console.log(
	JSON.stringify(
		[{ tag: 5 }, { tag: "a" }].map(data => {
			const out = Tagged(data)
			// what a standalone validator's errors keep of arktype's
			return out instanceof type.errors ?
					out.issues.map(issue => [issue.code, ...issue.path])
				:	out
		})
	)
)
