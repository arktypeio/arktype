import { scope, type } from "arktype"

const string = scope({ $root: "number", foo: "string" }).export()

const s = scope({
	string,
	base: "string",
	sub: "string.foo"
})

const types = s.export()
