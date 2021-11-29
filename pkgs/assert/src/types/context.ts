import { SourceRange, withCallRange } from "@re-do/node"
import { typeErrorChecker } from "./errors.js"
import { typeChecker } from "./types.js"

export const typeContext = (range: SourceRange, value: unknown) => {
    const getTypes = typeChecker(range)
    const getTypeErrors = typeErrorChecker(range)
    return Object.assign(getTypes, { errors: getTypeErrors })
}

export const typeOf = withCallRange(typeContext)
