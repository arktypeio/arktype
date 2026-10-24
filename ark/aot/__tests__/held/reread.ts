import { type } from "arktype"
import { isEven } from "./checkedDefault.ts"

// arktype prints isEven by the name it read where checkedDefault.ts defined its Type
export const Even = type({ a: [["number", ":", isEven], "=", 0] })
