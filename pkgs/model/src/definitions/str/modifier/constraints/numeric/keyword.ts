import { isInteger } from "@re-/tools"

export const numericKeywords: Record<string, (n: number) => string> = {
    int: (n) => (isInteger(n) ? "" : `${n} must be an integer.`),
    "+": (n) => (n > 0 ? "" : `${n} must be positive.`),
    "-": (n) => (n < 0 ? "" : `${n} must be negative.`)
}
