import { type } from "arktype"

const contributors = type("string")

const { data, problems } = contributors(["david@arktype.io"])

console.log(data ?? problems.summary)
//          ^?
