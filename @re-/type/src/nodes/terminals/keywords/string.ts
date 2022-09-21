import { Allows } from "../../allows.js"
import { Base } from "../../base.js"
import type {
    BoundableNode,
    BoundsConstraint
} from "../../constraints/bounds.js"
import type { ConstraintConstructorArgs } from "../../constraints/constraint.js"
import { Constraint } from "../../constraints/constraint.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { TerminalConstructorArgs } from "../terminal.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export type RegexLiteralDefinition = `/${string}/`
export type StringTypedDefinition = StringKeyword | RegexLiteralDefinition

export class StringNode extends TerminalNode implements BoundableNode {
    regexConstraint?: RegexConstraint
    bounds?: BoundsConstraint

    constructor(...args: TerminalConstructorArgs) {
        super(...args)
        if (this.definitionIsKeyOf(subtypes)) {
            this.regexConstraint = subtypes[this.definition]
        } else if (this.definition.match("/.*/")) {
            this.regexConstraint = new RegexConstraint(
                new RegExp(this.definition.slice(1, -1)),
                this.definition,
                `match expression ${this.definition}`
            )
        }
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "string") {
            args.diagnostics.push(new KeywordDiagnostic("string", args))
            return
        }

        this.bounds?.check(args as Allows.Args<string>)
    }

    generate() {
        if (this.regexConstraint || this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return ""
    }
}

export class RegexConstraint extends Constraint {
    constructor(public regex: RegExp, ...rest: ConstraintConstructorArgs) {
        super(rest)
    }

    check(args: Allows.Args<string>) {
        if (this.regex.test(args.data)) {
            args.diagnostics.push(
                new Allows.Diagnostic("regex", this.definition, args, {
                    reason: this.description
                })
            )
        }
    }
}

export const subtypes: Record<
    Exclude<StringKeyword, "string">,
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

export const stringKeywords = {
    string: StringNode,
    email: StringNode,
    alpha: StringNode,
    alphanumeric: StringNode,
    lowercase: StringNode,
    uppercase: StringNode
}

export type StringKeyword = keyof typeof stringKeywords
