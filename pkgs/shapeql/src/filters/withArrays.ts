import { fromEntries, deepMap } from "@re-do/utils"

const arrayConvertable = (o: any) =>
    o &&
    typeof o === "object" &&
    !Array.isArray(o) &&
    Object.keys(o).every(
        k =>
            typeof k === "number" || (typeof k === "string" && parseInt(k) >= 0)
    )

const toArray = (o: object) => fromEntries(Object.entries(o), true)

export const withArrays = (o: object) =>
    deepMap(o, value => (arrayConvertable(value) ? toArray(value) : value))
