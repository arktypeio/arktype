import {
    wellFormedIntegerMatcher,
    wellFormedNumberMatcher
} from "../../utils/numericLiterals.ts"
import { baseType, scope } from "../scope.ts"
import { creditCard } from "./creditCard.ts"
import { parsedDate } from "./date.ts"

// Non-trivial expressions should have an explanation or attribution

const parsedNumber = baseType(
    [wellFormedNumberMatcher, "|>", (s) => parseFloat(s)],
    { mustBe: "a well-formed numeric string" }
)

const parsedInteger = baseType(
    [wellFormedIntegerMatcher, "|>", (s) => parseInt(s)],
    { mustBe: "a well-formed integer string" }
)

// https://www.regular-expressions.info/email.html
const email = baseType([
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    ":",
    { mustBe: "a valid email" }
])

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = baseType([
    /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/,
    ":",
    { mustBe: "a valid UUID" }
])

export const validationScope = scope(
    {
        // Character sets
        alpha: [/^[A-Za-z]*$/, ":", { mustBe: "only letters" }],
        alphanumeric: [
            /^[A-Za-z\d]*$/,
            ":",
            { mustBe: "only letters and digits" }
        ],
        lowercase: [/^[a-z]*$/, ":", { mustBe: "only lowercase letters" }],
        uppercase: [/^[A-Z]*$/, ":", { mustBe: "only uppercase letters" }],
        creditCard,
        email,
        uuid,
        parsedNumber,
        parsedInteger,
        parsedDate,
        integer: ["node", { number: { divisor: 1 } }]
    },
    { name: "validation", standard: false }
)

export const validation = validationScope.compile()
