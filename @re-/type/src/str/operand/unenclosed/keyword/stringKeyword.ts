import { alphaNumericRegex, alphaOnlyRegex } from "@re-/tools"
import { boundConstraint } from "../../../operator/bound/bound.js"
import { regexConstraint } from "../../enclosed/index.js"
import { constrainable, Node, terminalNode } from "./common.js"

export type stringConstraint = regexConstraint | boundConstraint

export class stringNode
    extends terminalNode
    implements constrainable<stringConstraint>
{
    constructor(def: string, public constraints: stringConstraint[]) {
        super(def)
    }

    private dataIsString(
        args: Node.Allows.Args
    ): args is Node.Allows.Args<string> {
        return typeof args.data === "string"
    }

    allows(args: Node.Allows.Args) {
        if (!this.dataIsString(args)) {
            args.diagnostics.push(
                new Node.Allows.UnassignableDiagnostic(this.toString(), args)
            )
            return false
        }
        for (const constraint of this.constraints) {
            constraint.check(args)
        }
        return true
    }

    create() {
        return ""
    }
}

export const stringKeywordsToNodes = {
    string: new stringNode("string", []),
    email: new stringNode("email", [
        new regexConstraint("email", /^(.+)@(.+)\.(.+)$/, "be a valid email")
    ]),
    alpha: new stringNode("alpha", [
        new regexConstraint("alpha", alphaOnlyRegex, "include only letters")
    ]),
    alphanumeric: new stringNode("alphanumeric", [
        new regexConstraint(
            "alphanumeric",
            alphaNumericRegex,
            "include only letters and numbers"
        )
    ]),
    lower: new stringNode("lower", [
        new regexConstraint(
            "lower",
            /^[a-z]*$/,
            "include only lowercase letters"
        )
    ]),
    upper: new stringNode("upper", [
        new regexConstraint(
            "upper",
            /^[A-Z]*$/,
            "include only uppercase letters"
        )
    ])
}
