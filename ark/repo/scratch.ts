import { type } from "arktype"

const T = type(["number[]", "|", ["undefined"]])

T.assert([])
