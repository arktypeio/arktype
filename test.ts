import "./arkConfig.js"

import { keywords } from "@arktype/schema"
import { type } from "arktype"

console.log(type("string")(5).errors?.summary)

console.log(keywords.string.apply(5).errors?.summary)
