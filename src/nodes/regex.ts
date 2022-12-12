import type { keySet } from "../utils/generics.js"
import { mutateValues } from "../utils/objectUtils.js"
// import { composePredicateIntersection, equal } from "./compose.js"

const regexCache: Record<string, RegExp> = {}

// Non-trivial expressions should have an explanation or atttribution
export const sources = {
    // Character sets
    alpha: "[A-Za-z]*",
    alphanumeric: "[A-Za-zd]*",
    lowercase: "[a-z]*",
    // https://github.com/validatorjs/validator.js
    creditCard:
        "(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))",
    // https://www.regular-expressions.info
    email: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}"
}

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

// export const collapsibleKeysetIntersection =
//     composePredicateIntersection<CollapsibleKeyset>((l, r) => {
//         if (typeof l === "string") {
//             if (typeof r === "string") {
//                 return l === r ? equal : { [l]: true, [r]: true }
//             }
//             return r[l] ? r : { ...r, [l]: true }
//         }
//         if (typeof r === "string") {
//             return l[r] ? l : { ...l, [r]: true }
//         }
//         return { ...l, ...r }
//     })

// https://github.com/validatorjs/validator.js
// export default function isLuhnValid(str) {
//   assertString(str);
//   const sanitized = str.replace(/[- ]+/g, '');
//   let sum = 0;
//   let digit;
//   let tmpNum;
//   let shouldDouble;
//   for (let i = sanitized.length - 1; i >= 0; i--) {
//     digit = sanitized.substring(i, (i + 1));
//     tmpNum = parseInt(digit, 10);
//     if (shouldDouble) {
//       tmpNum *= 2;
//       if (tmpNum >= 10) {
//         sum += ((tmpNum % 10) + 1);
//       } else {
//         sum += tmpNum;
//       }
//     } else {
//       sum += tmpNum;
//     }
//     shouldDouble = !shouldDouble;
//   }
//   return !!((sum % 10) === 0 ? sanitized : false);
// }
