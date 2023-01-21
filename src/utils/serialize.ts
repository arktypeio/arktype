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
    serialize(value, []) as serialize<T>

export const stringSerialize = (value: unknown) => {
    const result = literalSerialize(value)
    return hasDomain(result, "object") ? JSON.stringify(result)! : `${result}`
}

// TODO: Refactor to use JSON stringify at top level?
const serialize = <t>(value: t, seen: unknown[]): unknown => {
    if (isRecursible(value)) {
        if (seen.includes(value)) {
            return "<cyclic>"
        } else {
            const serializedObject = Array.isArray(value)
                ? value.map((_) => serialize(_, [...seen, value]))
                : Object.fromEntries(
                      Object.entries(value).map(([k, v]) => [
                          k,
                          serialize(v, [...seen, value])
                      ])
                  )
            return serializedObject
        }
    } else {
        return serializePrimitive(value)
    }
}

const serializePrimitive = (value: unknown) => {
    switch (typeof value) {
        case "symbol":
            return `<symbol ${value.description ?? "(anonymous)"}>`
        case "function":
            return `<function${value.name ?? " (anonymous)"}>`
        case "undefined":
            return "<undefined>"
        case "bigint":
            return `<bigint ${value}>`
        default:
            return value
    }
}
