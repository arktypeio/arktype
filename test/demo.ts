

import { type } from "arktype"

const contributors = type("(string|number)[]")

const { data, problems } = contributors(["david@arktype.io"])
//      ^?

console.log(data ?? problems.summary)
