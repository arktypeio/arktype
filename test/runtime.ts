/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

const myType = type("string")

export type MyType = typeof myType.infer

const { data, problems } = myType("foo")

console.log(data ?? problems.summary)
