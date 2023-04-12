// @ts-ignore
import { format } from "prettier"
import { type } from "../../src/main.js"

const myType = type("number%2")

console.log(format(myType.compiled))

console.log(myType(3).problems?.summary)
