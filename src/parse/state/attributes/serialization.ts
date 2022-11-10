import { satisfies } from "../../../utils/generics.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import {
    parseWellFormedInteger,
    parseWellFormedNumber
} from "../../../utils/numericLiterals.js"
import {
    deserializePrimitive,
    serializePrimitive
} from "../../../utils/primitiveSerialization.js"
import type { Scanner } from "../scanner.js"
import type { Attribute, AttributeKey } from "./attributes.js"
import type { Bound, Bounds } from "./bounds.js"

export type SerializedBounds = SerializedBound | SerializedRange

export type SerializedBound = `${Scanner.Comparator}${number}`

export type SerializedRange = `${SerializedMin}${SerializedMax}`

export type SerializedMin = `${">" | ">="}${number}`

export type SerializedMax = `${"<" | "<="}${number}`

const boundStringRegex = /^([<>=]=?)([^<>=]+)$|^(>=?)([^<>=]+)(<=?)([^<>=]+)$/

const serializeBounds = (bounds: Bounds): SerializedBounds => {
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

const deserializeBounds = (boundsString: SerializedBounds): Bounds => {
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

const deserializeBound = (comparator: string, limit: number): Bounds => {
    const bound: Bound = {
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
): Bounds => ({
    min: {
        limit: minLimit,
        inclusive: minComparator[1] === "="
    },
    max: {
        limit: maxLimit,
        inclusive: maxComparator[1] === "="
    }
})

export type SerializedDivisor = NumberLiteral

export const serializeDivisor = (input: number): SerializedDivisor => `${input}`

export const deserializeDivisor = (serialized: SerializedDivisor) =>
    parseWellFormedInteger(serialized, true)

export const serializers = satisfies<{
    [k in AttributeKey]?: (input: any) => Attribute<k>
}>()({
    divisor: serializeDivisor,
    bounds: serializeBounds,
    value: serializePrimitive
})

type Serializers = typeof serializers

export type SerializedKey = keyof typeof serializers

type DeserializedFormats = {
    [k in SerializedKey]: Parameters<Serializers[k]>[0]
}

export const deserializers = satisfies<{
    [k in SerializedKey]: (serialized: Attribute<k>) => DeserializedFormats[k]
}>()({
    divisor: deserializeDivisor,
    bounds: deserializeBounds,
    value: deserializePrimitive
})

export type DeserializedAttribute<k extends AttributeKey> =
    k extends SerializedKey ? DeserializedFormats[k] : Attribute<k>
