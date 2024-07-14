import { type } from "arktype"

const nonEmpty = type("<arr extends number[] | bolean>", "arr > 0")
