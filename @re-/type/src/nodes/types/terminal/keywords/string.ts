import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { regexConstraint } from "../../../constraints/regex.js"
import { typeNode } from "./type.js"

export class stringNode extends typeNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(private regex?: regexConstraint) {
        super()
    }

    toString() {
        return this.regex?.definition ?? "string"
    }

    allowsValue(data: unknown) {
        if (typeof data === "string") {
            // this?.regex?.check(data)
            // this?.bounds?.check()
        }
        return typeof data === "string"
    }

    create(): string {
        return ""
    }
}

export const stringKeywords = {
    string: new stringNode(),
    email: new stringNode(
        new regexConstraint("email", /^(.+)@(.+)\.(.+)$/, "be a valid email")
    ),
    alpha: new stringNode(
        new regexConstraint("alpha", /^[A-Za-z]+$/, "include only letters")
    ),
    alphanumeric: new stringNode(
        new regexConstraint(
            "alphanumeric",
            /^[\dA-Za-z]+$/,
            "include only letters and digits"
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
