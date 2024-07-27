import { ark, type } from "arktype"

const t = type({
	foo: "string | number",
	bar: ["number | string | boolean"]
})

const o = type("string")

ark.Record
