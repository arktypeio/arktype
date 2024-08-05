import { type, ark } from "arktype"

const t = type({
	foo: "liftArray<string>",
	b: "number | boolean"
})

const a = ark.liftArray("string").t //=>?

const b = ark.Record("string", "number").t //=>?
