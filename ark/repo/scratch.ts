import { bench } from "@ark/attest"
import { match, type } from "arktype"

bench.baseline(() => {
	type("number")
	type("string")
})
