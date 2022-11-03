import type { Attributes } from "./shared.js"

export const union = (branches: Attributes[]): Attributes => {
    const result: Attributes = {}

    return { branches: ["|", ...branches] }
}
