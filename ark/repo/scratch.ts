import { attest } from "@ark/attest"
import { type } from "arktype"

const oneTo9999 = type("1 <= number.integer <= 9999")

const T = type({
	PORT: ["string.integer.parse", "=>", oneTo9999]
})
const defaults: typeof T.infer = {
	PORT: 123
}

process.env.PORT = "456"

const out = T.assert(process.env)

console.log(out.PORT)
