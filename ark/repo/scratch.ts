import { scope, type, type Type } from "arktype"

const a = type("'foo'")

const b: Type<string> = a

const foo = scope({
	foo: "string"
}).resolve("foo")

const t: Type.Any = foo
