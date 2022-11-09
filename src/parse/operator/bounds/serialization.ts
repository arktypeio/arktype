import { throwInternalError } from "../../../utils/internalArktypeError.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { Scanner } from "../../state/scanner.js"

export type SerializedBounds = SerializedBound | SerializedRange

export type SerializedBound = `${Scanner.Comparator}${number}`

export type SerializedRange = `${SerializedMin}${SerializedMax}`

export type SerializedMin = `${">" | ">="}${number}`

export type SerializedMax = `${"<" | "<="}${number}`

const boundStringRegex = /^([<>=]=?)([^<>=]+)$|^(>=?)([^<>=]+)(<=?)([^<>=]+)$/

export type DeserializedBounds = {
    min?: DeserializedBound
    max?: DeserializedBound
}

export type DeserializedBound = {
    limit: number
    inclusive: boolean
}

export const serializeBounds = (
    bounds: DeserializedBounds
): SerializedBounds => {
    if (bounds.min?.limit === bounds.max?.limit) {
        return `==${bounds.min!.limit}`
    }
    let result = ""
    if (bounds.min) {
        result += bounds.min.inclusive ? ">=" : ">"
        result += bounds.min.limit
    }
    if (bounds.max) {
        result += bounds.max.inclusive ? "<=" : "<"
        result += bounds.max.limit
    }
    return result as SerializedBounds
}

export const deserializeBounds = (
    boundsString: SerializedBounds
): DeserializedBounds => {
    const matches = boundStringRegex.exec(boundsString)
    if (!matches) {
        return throwInternalError(
            `Unexpectedly failed to parse bounds from '${boundsString}'`
        )
    }
    if (matches[1]) {
        return deserializeBound(
            matches[1],
            parseWellFormedNumber(matches[2], true)
        )
    }
    return deserializeRange(
        matches[3],
        parseWellFormedNumber(matches[4], true),
        matches[5],
        parseWellFormedNumber(matches[6], true)
    )
}

const deserializeBound = (
    comparator: string,
    limit: number
): DeserializedBounds => {
    const bound: DeserializedBound = {
        limit,
        inclusive: comparator[1] === "="
    }
    if (comparator === "==") {
        return { min: bound, max: bound }
    } else if (comparator === ">" || comparator === ">=") {
        return {
            min: bound
        }
    } else {
        return {
            max: bound
        }
    }
}

const deserializeRange = (
    minComparator: string,
    minLimit: number,
    maxComparator: string,
    maxLimit: number
): DeserializedBounds => ({
    min: {
        limit: minLimit,
        inclusive: minComparator[1] === "="
    },
    max: {
        limit: maxLimit,
        inclusive: maxComparator[1] === "="
    }
})
