import type { CheckState } from "../../traverse/check.ts"
import { DiagnosticMessageBuilder } from "../../traverse/problems.ts"
import type { CollapsibleList } from "../../utils/generics.ts"
import { composeIntersection } from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"

const regexCache: Record<string, RegExp> = {}

// Non-trivial expressions should have an explanation or atttribution
export const sources = {
    // Character sets
    alpha: /^[A-Z]*$/i,
    alphanumeric: /^[A-Z\d]*$/i,
    lowercase: /^[a-z]*$/,
    uppercase: /^[A-Z]*$/,
    // https://github.com/validatorjs/validator.js
    creditCard:
        /^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/,
    // https://www.regular-expressions.info
    email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    // https://github.com/validatorjs/validator.js
    uuid: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}

export const checkRegexRule = (
    state: CheckState<string>,
    rule: RegExp | string
) => {
    let ruleAsRegExp
    if (typeof rule === "string") {
        ruleAsRegExp = getRegex(rule)
    }
    //TODO: howdu I do
    checkRegex(state, ruleAsRegExp ?? (rule as RegExp))
}

export type RegexErrorContext = {
    data: string
    rule: RegExp
}

export const buildRegexError: DiagnosticMessageBuilder<"RegexMismatch"> = ({
    data,
    rule
}) => `'${data}' must match expression /${rule}/.`

const checkRegex = (state: CheckState<string>, source: RegExp) => {
    if (!source.test(state.data)) {
        state.problems.addProblem(state, { data: state.data, rule: source })
    }
}

export const regexIntersection = composeIntersection<CollapsibleList<string>>(
    collapsibleListUnion<string>
)

// https://github.com/validatorjs/validator.js
export const isLuhnValid = (creditCardInput: string) => {
    const sanitized = creditCardInput.replace(/[- ]+/g, "")
    let sum = 0
    let digit
    let tmpNum
    let shouldDouble
    for (let i = sanitized.length - 1; i >= 0; i--) {
        digit = sanitized.substring(i, i + 1)
        tmpNum = parseInt(digit, 10)
        if (shouldDouble) {
            tmpNum *= 2
            if (tmpNum >= 10) {
                sum += (tmpNum % 10) + 1
            } else {
                sum += tmpNum
            }
        } else {
            sum += tmpNum
        }
        shouldDouble = !shouldDouble
    }
    return !!(sum % 10 === 0 ? sanitized : false)
}
