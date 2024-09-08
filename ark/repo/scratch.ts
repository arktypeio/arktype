import { type } from "arktype"

const t = type({ foo: "1" })
	.or({ bar: "1" })
	.pipe(o => Object.values(o))

console.log(t.internal.precompilation)

type({
	foo: "string.normalize.NFC.preformatted"
})
