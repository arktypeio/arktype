import { alphaNumericRegex, alphaOnlyRegex } from "@re-/tools"
import { regexConstraint } from "../../enclosed/index.js"
import { stringNode } from "./typeKeyword.js"

export const stringKeywordsToNodes = {
    string: new stringNode(),
    email: new stringNode(
        new regexConstraint("email", /^(.+)@(.+)\.(.+)$/, "be a valid email")
    ),
    alpha: new stringNode(
        new regexConstraint("alpha", alphaOnlyRegex, "include only letters")
    ),
    alphanumeric: new stringNode(
        new regexConstraint(
            "alphanumeric",
            alphaNumericRegex,
            "include only letters and numbers"
        )
    ),
    lower: new stringNode(
        new regexConstraint(
            "lower",
            /^[a-z]*$/,
            "include only lowercase letters"
        )
    ),
    upper: new stringNode(
        new regexConstraint(
            "upper",
            /^[A-Z]*$/,
            "include only uppercase letters"
        )
    )
}
