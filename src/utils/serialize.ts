import { hasDomain } from "./domains.ts"

export const isRecursible = (value: unknown): value is object =>
    typeof value === "object" && value !== null

type StringifiedValue = undefined | symbol | bigint | Function

// A little repetitive but avoids infinite recursion on certain types. Could be
// optimized.
export type serialize<t> = t extends StringifiedValue
    ? string
    : t extends object
    ? {
          [k in keyof t]: t[k] extends StringifiedValue
              ? string
              : t[k] extends object
              ? serialize<t[k]>
              : t[k]
      }
    : t

export const literalSerialize = <T>(value: T) =>
    serializeRecurse(value, false, []) as serialize<T>

export const serialize = (value: unknown) => {
    const result = serializeRecurse(value, true, [])
    return hasDomain(result, "object") ? JSON.stringify(result)! : `${result}`
}

export const stringify = (value: unknown) => {
    const result = serializeRecurse(value, false, [])
    return hasDomain(result, "object") ? JSON.stringify(result)! : `${result}`
}

// TODO: fix deserialize
// TODO: Refactor to use JSON stringify at top level?
const serializeRecurse = <t>(
    value: t,
    quoteStrings: boolean,
    seen: unknown[]
): unknown => {
    if (isRecursible(value)) {
        if (seen.includes(value)) {
            return "(cyclic)"
        } else {
            const serializedObject = Array.isArray(value)
                ? value.map((_) =>
                      serializeRecurse(_, quoteStrings, [...seen, value])
                  )
                : Object.fromEntries(
                      Object.entries(value).map(([k, v]) => [
                          k,
                          serializeRecurse(v, quoteStrings, [...seen, value])
                      ])
                  )
            return serializedObject
        }
    } else {
        return serializePrimitive(value, quoteStrings)
    }
}

const serializePrimitive = (value: unknown, quoteStrings: boolean) => {
    switch (typeof value) {
        case "string":
            return quoteStrings ? `'${value}'` : value
        case "symbol":
            return `(symbol ${value.description ?? ""})`
        case "function":
            return `(function ${value.name ?? ""})`
        case "undefined":
            return "(undefined)"
        case "bigint":
            return `${value}n`
        default:
            return value
    }
}
