import { generic } from "arktype"

export const emptyList = () => []

export const Defaulting = generic("t")({
	a: [["string", "[]"], "=", emptyList]
})
