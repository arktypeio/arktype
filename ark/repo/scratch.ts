import { scope, type, type Type } from "arktype"

const foo = scope({
	foo: "string"
}).resolve("foo")

const t: Type.Any = foo
