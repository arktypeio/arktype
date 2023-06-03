import { TypeNode } from "../../nodes/type.js"
import { Scope } from "../../scope.js"
import {
    wellFormedIntegerMatcher,
    wellFormedNumberMatcher
} from "../../utils/numericLiterals.js"
import { creditCard } from "./creditCard.js"
import { parsedDate } from "./date.js"

// Non-trivial expressions should have an explanation or attribution

// TODO: { mustBe: "a well-formed numeric string" }
const parsedNumber = TypeNode.from({
    basis: "string",
    regex: wellFormedNumberMatcher.source,
    morph: (s) => parseFloat(s)
})

const parsedInteger = TypeNode.from({
    basis: "string",
    regex: wellFormedIntegerMatcher.source,
    morph: (s) => parseInt(s)
    // TODO:
    // morph: (s, problems) => {
    //     if (!isWellFormedInteger(s)) {
    //         return problems.mustBe("a well-formed integer string")
    //     }

    //     const parsed = parseInt(s)

    //     return Number.isSafeInteger(parsed)
    //         ? parsed
    //         : problems.mustBe(
    //               "an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
    //           )
    // }
})

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

//  "a valid email"
const email = TypeNode.from({
    basis: "string",
    regex: emailMatcher.source
})

const uuidMatcher =
    /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
// "a valid UUID"
const uuid = TypeNode.from({
    basis: "string",
    regex: uuidMatcher.source
})

const semverMatcher =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
// "a valid semantic version (see https://semver.org/)"
const semver = TypeNode.from({
    basis: "string",
    regex: semverMatcher.source
})

// "a JSON-parsable string"
const json = TypeNode.from({
    basis: "string",
    morph: (s) => JSON.parse(s)
})

// "alpha": "only letters",
// "alphanumeric": "only letters and digits",
// "lowercase": "only lowercase letters",
// "uppercase": "only uppercase letters",
// "creditCard": "a valid credit card number",
// "email": "a valid email",
// "uuid": "a valid UUID",
// "parsedNumber": "a well-formed numeric string",
// "parsedInteger": "a well-formed integer string",
// "parsedDate": "a valid date",
// "semver": "a valid semantic version",
// "json": "a JSON-parsable string",
// "integer": "an integer"
export const validation = Scope.root({
    // Character sets
    alpha: /^[A-Za-z]*$/,
    alphanumeric: /^[A-Za-z\d]*$/,
    lowercase: /^[a-z]*$/,
    uppercase: /^[A-Z]*$/,
    creditCard,
    email,
    uuid,
    parsedNumber,
    parsedInteger,
    parsedDate,
    semver,
    json,
    integer: TypeNode.from({ basis: "number", divisor: 1 })
})

export const validationTypes = validation.compile()
