export type SizedData = string | number | readonly unknown[]

export const sizeOf = (data: unknown) =>
    typeof data === "string" || Array.isArray(data)
        ? data.length
        : typeof data === "number"
        ? data
        : 0

export const unitsOf = (data: unknown) =>
    typeof data === "string" ? "characters" : Array.isArray(data) ? "items" : ""
