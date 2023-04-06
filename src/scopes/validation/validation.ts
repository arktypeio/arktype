import {
    wellFormedIntegerMatcher,
    wellFormedNumberMatcher
} from "../../utils/numericLiterals.ts"
import { rootType, scope } from "../scope.js"
import { tsKeywords } from "../tsKeywords.js"
import { creditCard } from "./creditCard.js"
import { parsedDate } from "./date.js"

// Non-trivial expressions should have an explanation or attribution

const parsedNumber = rootType(
    [wellFormedNumberMatcher, "|>", (s) => parseFloat(s)],
    { mustBe: "a well-formed numeric string" }
)

const parsedInteger = rootType(
    [wellFormedIntegerMatcher, "|>", (s) => parseInt(s)],
    { mustBe: "a well-formed integer string" }
)

// https://www.regular-expressions.info/email.html
const email = rootType(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, {
    mustBe: "a valid email"
})

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = rootType(
    /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/,
    { mustBe: "a valid UUID" }
)

// https://semver.org/
const semver = rootType(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
    { mustBe: "a valid semantic version (see https://semver.org/)" }
)

const json = rootType([tsKeywords.string, "|>", (s) => JSON.parse(s)], {
    mustBe: "a JSON-parsable string"
})

/**
 * @keywords keywords: { 
        "alpha": "only letters",
        "alphanumeric": "only letters and digits",
        "lowercase": "only lowercase letters",
        "uppercase": "only uppercase letters",
        "creditCard": "a valid credit card number",
        "email": "a valid email",
        "uuid": "a valid UUID",
        "parsedNumber": "a well-formed numeric string",
        "parsedInteger": "a well-formed integer string",
        "parsedDate": "a valid date",
        "semver": "a valid semantic version",
        "json": "a JSON-parsable string",
        "integer": "an integer"
}
 * @docgenScope
 * @docgenTable
 */
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
        semver,
        json,
        integer: ["node", { number: { divisor: 1 } }]
    },
    { name: "validation", standard: false }
)

export const validation = validationScope.compile()
