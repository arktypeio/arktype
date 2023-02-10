import { domainOf } from "./domains.ts"
import { stringify } from "./serialize.ts"

export type SizedData = string | number | readonly unknown[]

export const sizeOf = (data: unknown) =>
    typeof data === "string" || Array.isArray(data)
        ? data.length
        : typeof data === "number"
        ? data
        : 0

export const unitsOf = (data: unknown) =>
    typeof data === "string" ? "characters" : Array.isArray(data) ? "items" : ""

export class DataWrapper<value = unknown> {
    constructor(public value: value) {}

    toString() {
        return stringify(this.value)
    }

    get domain() {
        return domainOf(this.value)
    }

    get size() {
        return sizeOf(this.value)
    }

    get units() {
        return unitsOf(this.value)
    }

    get className() {
        return Object(this.value).constructor.name
    }
}
