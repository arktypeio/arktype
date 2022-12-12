import type { keySet } from "../utils/generics.js"
import { mutateValues } from "../utils/objectUtils.js"
import { composePredicateIntersection, equal } from "./compose.js"

const regexCache: Record<string, RegExp> = {}

const delimitRepititions = (
    baseSource: string,
    delimiterSource: string,
    quanitifer = "*"
) => `(${baseSource}(?:${delimiterSource}${baseSource})${quanitifer})`

const maxLength = (baseSource: string, allowedCharacters: number) =>
    `(?!.{${allowedCharacters + 1}})${baseSource}`

const finalize = (baseSource: string) => `^${baseSource}$`

const alphaCharSet = "A-Za-z"

const alpha = `[${alphaCharSet}]*`

const alphanumericCharSet = `${alphaCharSet}\\d`

const alphanumeric = `[${alphanumericCharSet}]*`

// a portion of an email username when split by "."
const emailUserSegment = `[${alphanumericCharSet}!#$%&'*+\\-/=?^_\`{|}~]+`

const emailUser = delimitRepititions(emailUserSegment, "\\.")

const fqdnSegment = maxLength(
    `(?!-)[${alphanumericCharSet}-\\u00a1-\\uffff]+`,
    63
)

const fqdn = delimitRepititions(fqdnSegment, "\\.", "{1,}")

console.log(fqdn)

const email = maxLength(`${emailUser}@${fqdn}`, 254)

const creditCard =
    "(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))"

// Unless otherwise noted, expressions are simplified versions of validator.js
// (https://github.com/validatorjs/validator.js) equivalents with default options.
export const sources = mutateValues(
    {
        // alpha and alphanumeric were adjusted to match an empty string, which
        // should be vacuously true according to their description.
        alpha,
        alphanumeric,
        creditCard,
        email,
        fqdn
    },
    finalize
)

const emailRegex = new RegExp(sources.email)

console.log(emailRegex.test("foo@z.co"))

console.log(emailRegex.source)

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const checkRegex = (data: string, regex: CollapsibleKeyset) =>
    typeof regex === "string" ? checkRegexExpression(data, regex) : true //regex.every((regexSource) => checkRegexExpression(data, regexSource))

export const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export type CollapsibleKeyset = string | keySet

export const collapsibleKeysetIntersection =
    composePredicateIntersection<CollapsibleKeyset>((l, r) => {
        if (typeof l === "string") {
            if (typeof r === "string") {
                return l === r ? equal : { [l]: true, [r]: true }
            }
            return r[l] ? r : { ...r, [l]: true }
        }
        if (typeof r === "string") {
            return l[r] ? l : { ...l, [r]: true }
        }
        return { ...l, ...r }
    })
