import {
    wellFormedIntegerMatcher,
    wellFormedNumberMatcher
} from "../utils/numericLiterals.ts"
import { scope } from "./scope.ts"

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

// Non-trivial expressions should have an explanation or attribution
export const validationScope = scope(
    {
        // Character sets
        alpha: /^[A-Za-z]*$/,
        alphanumeric: /^[A-Za-z\d]*$/,
        lowercase: /^[a-z]*$/,
        uppercase: /^[A-Z]*$/,
        // https://github.com/validatorjs/validator.js
        creditCard: [
            /^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/,
            "=>",
            (s, problems) =>
                isLuhnValid(s) ||
                !problems.add("custom", "a valid credit card number")
        ],
        // https://www.regular-expressions.info
        email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        // https://github.com/validatorjs/validator.js
        uuid: /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/,
        parsedNumber: [wellFormedNumberMatcher, "|>", (s) => parseFloat(s)],
        parsedInteger: [wellFormedIntegerMatcher, "|>", (s) => parseInt(s)],
        integer: ["node", { number: { divisor: 1 } }]
    },
    { name: "validation", standard: false }
)

export const validation = validationScope.compile()
