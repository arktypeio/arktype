import { type } from "arktype"

const contributors = type("email[]>1")

const { data, problems } = contributors([
    "david@arktype.io",
    "shawn@arktype.io"
])

console.log(data ?? problems.summary)
//          ^?
