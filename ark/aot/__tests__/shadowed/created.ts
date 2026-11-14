import "./mocked.ts"
import { type } from "arktype"
import { isLong } from "./holes.ts"

export const Long = type("string").narrow(isLong)
