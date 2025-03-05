import { type } from "arktype"

const t = type({
	/** FOO */
	foo: "string",
	/** BAR */
	bar: "number?"
})

const out = t.assert({ foo: "foo" })

out.foo
out.bar
