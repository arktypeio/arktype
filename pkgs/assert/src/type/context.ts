import { SourceRange, withCallRange } from "@re-do/node"
import { getTypeErrors, typeErrorChecker } from "./errors.js"
import { typeChecker } from "./types.js"

export const typeContext = (range: SourceRange, value: unknown) => {
    const getTypes = typeChecker(range)
    return Object.assign(getTypes, { errors: typeErrorsContext(range, value) })
}

export const typeOf = withCallRange(typeContext)

export const typeErrorsContext = (range: SourceRange, value: unknown) =>
    typeErrorChecker(range)

export const typeErrorsOf = withCallRange(typeErrorsContext)
