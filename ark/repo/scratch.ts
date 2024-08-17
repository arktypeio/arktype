import { scope, type } from "arktype"

const foo = scope({ $root: "number", foo: "string" }).export()

const s = scope({
	foo: foo,
	base: "string",
	sub: "foo.foo"
})

const types = s.export()
