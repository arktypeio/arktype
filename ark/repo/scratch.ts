import { type } from "arktype"

console.log(
	type({
		foo: type("string").pipe(() => 123)
	})
		.pipe(c => c)
		.to({
			foo: "123"
		})({
		foo: "bar"
	}) + ""
)
// foo must be 123 (was "bar")
