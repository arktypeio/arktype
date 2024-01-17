import "./arkConfig.js"

import { keywords } from "@arktype/schema"

console.log(keywords.string.apply(5).errors?.summary)

// user //?

// type User = typeof user.infer
