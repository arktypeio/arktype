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

export const literalSerialize = <T>(value: T): serialize<T> =>
    serialize(value, false, [])

export const stringSerialize = (value: unknown) => serialize(value, true, [])

const serialize = <t>(
    value: t,
    alwaysStringify: boolean,
    seen: unknown[]
): any => {
    if (isRecursible(value)) {
        if (seen.includes(value)) {
            return "<cyclic>"
        } else {
            const serializedObject = Array.isArray(value)
                ? value.map((_) =>
                      serialize(_, alwaysStringify, [...seen, value])
                  )
                : Object.fromEntries(
                      Object.entries(value).map(([k, v]) => [
                          k,
                          serialize(v, alwaysStringify, [...seen, value])
                      ])
                  )
            return alwaysStringify
                ? JSON.stringify(serializedObject)
                : serializedObject
        }
    } else {
        return serializePrimitive(value, alwaysStringify)
    }
}

const serializePrimitive = (value: unknown, stringify?: boolean) => {
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
            return stringify ? JSON.stringify(value) : value
    }
}
