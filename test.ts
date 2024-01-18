import "./arkConfig.js"

import { type } from "arktype"

typeof type //?

const s = type("string")

console.log(type("string")(5).errors?.summary) //?

// console.log(keywords.string.apply(5).errors?.summary)
