import { RegexConstraint } from "../../constraints/regex.js"
import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class StringNode extends TerminalNode<StringTypedDefinition> {
    constructor(protected def: StringTypedDefinition) {
        super(def)
        if (this.def === "string") {
            return
        }
        if (this.typeDefIsKeyOf(stringSubtypes)) {
            this.constraints.regex = stringSubtypes[this.def]
        } else {
            this.constraints.regex = new RegexConstraint(
                new RegExp(this.def.slice(1, -1)),
                this.def,
                `Must match expression ${this.def}`
            )
        }
    }

    check(state: Check.CheckState) {
        if (!state.dataIsOfType("string")) {
            if (this.def === "string") {
                addTypeKeywordDiagnostic(state, "string", "Must be a string")
            } else {
                addTypeKeywordDiagnostic(
                    state,
                    this.def,
                    "Must be a string",
                    "string"
                )
            }
            return
        }
    }

    generate() {
        return ""
    }
}

export const stringSubtypes: Record<
    Exclude<StringTypedKeyword, "string">,
    RegexConstraint
> = {
    email: new RegexConstraint(
        /^(.+)@(.+)\.(.+)$/,
        "email",
        "Must be a valid email"
    ),
    alpha: new RegexConstraint(
        /^[A-Za-z]+$/,
        "alpha",
        "Must include only letters"
    ),
    alphanumeric: new RegexConstraint(
        /^[\dA-Za-z]+$/,
        "alphanumeric",
        "Must include only letters and digits"
    ),
    lowercase: new RegexConstraint(
        /^[a-z]*$/,
        "lowercase",
        "Must include only lowercase letters"
    ),
    uppercase: new RegexConstraint(
        /^[A-Z]*$/,
        "uppercase",
        "Must include only uppercase letters"
    )
}

export const stringTypedKeywords = {
    string: StringNode,
    email: StringNode,
    alpha: StringNode,
    alphanumeric: StringNode,
    lowercase: StringNode,
    uppercase: StringNode
}

export type StringTypedKeyword = keyof typeof stringTypedKeywords

export type StringSubtypeKeyword = keyof typeof stringSubtypes

export type StringSubtypeDefinition =
    | StringSubtypeKeyword
    | RegexLiteralDefinition

export type RegexLiteralDefinition = `/${string}/`

export type StringTypedDefinition = StringTypedKeyword | RegexLiteralDefinition
