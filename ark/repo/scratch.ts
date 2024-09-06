import { type } from "arktype"

const t = type(["string", "string"])
	.array()
	.or(["null", "=>", () => undefined])

const T = t.infer
