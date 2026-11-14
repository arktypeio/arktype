import { type } from "arktype"

let validated = 0
let ran = false

const noteFirstRun = () => {
	ran = true
}

it("output", () => {
	type("number").narrow(n => n > validated++)(1)
})

it("calls", () => {
	if (!ran) noteFirstRun()
})
