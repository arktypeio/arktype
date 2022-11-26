import type { DataTypeName, DataTypes, record } from "../utils/dataTypes.js"
import { dataTypeOf } from "../utils/dataTypes.js"
import type { TypeBranches } from "./node.js"
import { checkNumber } from "./number.js"
import { checkString } from "./string.js"

export const check = (data: unknown, branches: TypeBranches) => {
    const dataType = dataTypeOf(data)
    const attributes = branches.find((branch) => branch.type === dataType)
    if (!attributes) {
        return false
    }
    return checkers[dataType](data as never, attributes)
}

const checkers: {
    [k in DataTypeName]: (data: DataTypes[k], attributes: record) => boolean
} = {
    number: checkNumber,
    string: checkString
}
