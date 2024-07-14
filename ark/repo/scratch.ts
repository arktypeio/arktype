import { type } from "arktype"

const nonEmpty = type("<arr extends unknown[]>", "arr > 0")

const m = nonEmpty("number[]")
