import { scope, type } from "arktype"

const nonEmpty = type("<arr extends unknown[]>", "arr > 0")

const m = nonEmpty("number[]")

const threeSixtyNoModule = scope({
	three: "3",
	sixty: "60",
	no: "'no'"
}).export()

const types = scope({
	...threeSixtyNoModule,
	threeSixtyNo: "three|sixty|no"
}).export()
