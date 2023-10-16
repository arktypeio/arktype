import { type } from "arktype"

const user = type({
	name: "string",
	age: "number",
	luckyNumbers: "(number|bigint)[]"
})

class MyClass {
	#private = true

	pub = true
}

declare global {
	export interface ArkConfig {
		preserve(): MyClass
	}
}

const t = type("instanceof", MyClass)

type Out = typeof t.infer
