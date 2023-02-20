/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"









const contributors = type("string|number[]")

export type Contributors = typeof contributors.infer
//          ^?

const { data, problems } = contributors(["david@arktype.io"])

console.log(data ?? problems.summary)
