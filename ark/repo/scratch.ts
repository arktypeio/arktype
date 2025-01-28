import { declare, scope, type } from "arktype"

// number
const n = type("1 | number").expression

const t = type("string.trim > 2")
