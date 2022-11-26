import { dataTypeOf } from "../utils/dataTypes.js"
import type { TypeBranches } from "./node.js"

export const check = (data: unknown, branches: TypeBranches) => {
    const dataType = dataTypeOf(data)
    const attributes = branches.find((branch) => branch.type === dataType)
    if (!attributes) {
        return false
    }
    return checkers[dataType](data as never, attributes)
}
