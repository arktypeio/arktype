import { type } from "arktype"

export const workerMessageSchema = type({
	type: "'foo' | 'bar'",
	sequence: "number",
	body: "object"
}).narrow((event, ctx) => {
	return ctx.reject("whoops")
})

workerMessageSchema({
	type: "foo",
	sequence: 5,
	body: ""
}) //?
