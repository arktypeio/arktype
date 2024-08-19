// import { generic, type } from "arktype"

// const fooIntoBox = generic([
// 	"t",
// 	{
// 		foo: "number"
// 	}
// ])({ boxOf: "t" })

// export const good = fooIntoBox({
// 	foo: "number"
// })

// const bad = fooIntoBox({
// 	foo: "string"
// })

// const d = type("<t>", {
// 	box: "t"
// })

// const ttt = d({
// 	inner: "5"
// })

// const errorMessage =
// 	'Argument of type \'"number"\' is not assignable to parameter of type \'"number" & ErrorType<"Invalid argument for t", [expected: { foo: number; }]>\'.'
// const regex =
// 	/^Argument of type '.*' is not assignable to parameter of type '.*& (ErrorType<[^>]+>)'/

// const match = errorMessage.match(regex)
// if (match) {
// 	console.log(match[1]) // Output: ErrorType<"Invalid argument for t", [expected: { foo: number; }]>
// } else {
// 	console.log("No match found")
// }

import type { inferAmbient, validateAmbient } from "arktype"

export function defineQuery<inputDef, outputDef>(opts: {
	// TODO: constrain to something compatible with URLSearchParams
	input?: validateAmbient<inputDef>
	// TODO: constrain to Json
	output: validateAmbient<outputDef>
	query: NoInfer<
		(opts: {
			input: inferAmbient<inputDef>
		}) => Promise<inferAmbient<outputDef>>
	>
}) {
	return opts.query
}

import { define } from "arktype"

const user = define({
	username: "string",
	"displayName?": "string"
})

const listUsers = defineQuery({
	output: [user, "[]"],
	async query() {
		return [{ username: "alice" }]
	}
})

const getUser = defineQuery({
	input: {
		username: "string"
	},
	output: user,
	async query({ input }) {
		return { username: "alice" }
	}
})
