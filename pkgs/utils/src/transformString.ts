import { FilterFunction } from "./filter.js"

export const alphaOnlyRegex = /^[a-zA-Z]+$/

export const digitsOnlyRegex = /^[0-9]+$/

export const alphaNumericRegex = /^[0-9a-zA-Z]+$/

export const isAlpha = (s: string) => alphaOnlyRegex.test(s)

export const isDigits = (s: string) => digitsOnlyRegex.test(s)

export type NumericString<N extends number = number> = `${N}`

export const isNumeric = (s: any) => asNumber(s) !== null

export type AsNumberOptions = { asFloat?: boolean }

export type StringOrNumberFrom<
    K,
    Original = K & (string | number)
> = Original extends number
    ? Original | `${Original}`
    : Original extends NumericString<infer Value>
    ? Value | Original
    : Original

export const asNumber = (s: any, options?: AsNumberOptions) => {
    const parseNumber = options?.asFloat ? Number.parseFloat : Number.parseInt
    const result = parseNumber(String(s))
    return isNaN(result) ? null : result
}

export const isAlphaNumeric = (s: string) => alphaNumericRegex.test(s)

export const filterChars = (s: string, charFilter: FilterFunction<string>) =>
    s.split("").filter(charFilter).join("")

type TransformSubstringOptions = {
    original: string
    transform: (original: string) => string
    start?: number
    end?: number
}

export const transformSubstring = ({
    original,
    transform,
    start,
    end
}: TransformSubstringOptions) =>
    `${start ? original.slice(0, start) : ""}${transform(
        original.slice(start, end)
    )}${end ? original.slice(end) : ""}`

export const camelCase = (words: string[]) =>
    `${words[0].toLowerCase()}${capsCase(words.slice(1))}`

export const capitalize = <W extends string>(word: W) =>
    transformSubstring({
        original: word,
        transform: (_) => _.toUpperCase(),
        end: 1
    }) as Capitalize<W>

export const uncapitalize = <W extends string>(word: W) =>
    transformSubstring({
        original: word,
        transform: (_) => _.toLowerCase(),
        end: 1
    }) as Uncapitalize<W>

export const lettersAfterFirstToLower = (word: string) =>
    transformSubstring({
        original: word,
        transform: (_) => _.toLowerCase(),
        start: 1
    })

export const capsCase = (words: string[]) =>
    words.map((word) => capitalize(lettersAfterFirstToLower(word))).join("")
