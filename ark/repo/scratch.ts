import { type } from "arktype"

const len = type.fn("string | unknown[]", ":", "number")(s => s.length)

len.params.expression //?
len.returns.allows(5) //?

len(5 as any)
