import { type } from "arktype"

const T = type.enumerated(...[...new Array(12)].map((_, i) => i))

console.log(T.expression)
