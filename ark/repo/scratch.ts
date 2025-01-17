import { type } from "arktype"

const user = type({
	name: "string",
	projects: "string[]",
	nested: {
		nested2: {
			key: "string.numeric.parse | number"
		}
	}
})

user.extends({ name: "string" }) //?

const out = user({
	name: "Josh Goldberg",
	projects: ["typescript-eslint", "mocha", 999]
})

if (out instanceof type.errors) {
	console.log(`Encountered ${out.length} errors:`)
	console.log(out.summary)
} else {
	console.log(`Valid result:`)
	console.log(out)
}

console.log(user.expression)
