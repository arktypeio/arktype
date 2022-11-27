import { dataTypeOf } from "../utils/dataTypes.js"
import type { BranchNode } from "./node.js"

export const check = (data: unknown, branches: BranchNode) => {
    const dataType = dataTypeOf(data)
    const attributes = branches.find((branch) => branch.type === dataType)
    if (!attributes) {
        return false
    }
    return checkers[dataType](data as never, attributes)
}
