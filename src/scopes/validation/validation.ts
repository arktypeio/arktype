import { TypeNode } from "../../nodes/type.js"
import { scope } from "../../scope.js"
import {
    wellFormedIntegerMatcher,
    wellFormedNumberMatcher
} from "../../utils/numericLiterals.js"
import { creditCard } from "./creditCard.js"
import { parsedDate } from "./date.js"

// Non-trivial expressions should have an explanation or attribution

// TODO: { mustBe: "a well-formed numeric string" }
const parsedNumber = TypeNode.from({
    kind: "string",
    regex: wellFormedNumberMatcher.source,
    morph: (s) => parseFloat(s)
})

// TODO:  { mustBe: "a well-formed integer string" }
const parsedInteger = TypeNode.from({
    kind: "string",
    regex: wellFormedIntegerMatcher.source,
    morph: (s) => parseInt(s)
})

const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

// https://www.regular-expressions.info/email.html
//  "a valid email"
const email = TypeNode.from({
    kind: "string",
    regex: emailMatcher.source
})

const uuidMatcher =
    /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
// "a valid UUID"
const uuid = TypeNode.from({
    kind: "string",
    regex: uuidMatcher.source
})

const semverMatcher =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
// "a valid semantic version (see https://semver.org/)"
const semver = TypeNode.from({
    kind: "string",
    regex: semverMatcher.source
})

// "a JSON-parsable string"
const json = TypeNode.from({
    kind: "string",
    morph: (s) => JSON.parse(s)
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
        integer: TypeNode.from({ kind: "number", divisor: 1 })
    },
    { name: "validation", standard: false }
)

export const validation = validationScope.compile()
