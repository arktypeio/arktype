import { Allows } from "../../allows.js"
import type { boundableNode, bounds } from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/common.js"
import type { TerminalConstructorArgs } from "../terminal.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export type RegexLiteralDefinition = `/${string}/`
export type StringTypedDefinition = StringKeyword | RegexLiteralDefinition

export class StringNode extends TerminalNode implements boundableNode {
    regexConstraint?: regexConstraint
    bounds?: bounds

    constructor(...args: TerminalConstructorArgs) {
        super(...args)
        if (this.definitionIsKeyOf(subtypes)) {
            this.regexConstraint = subtypes[this.definition]
        } else if (this.definition.match("/.*/")) {
            this.regexConstraint = {
                matcher: new RegExp(this.definition.slice(1, -1)),
                description: `match expression ${this.definition}`
            }
        }
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "string") {
            args.diagnostics.push(new KeywordDiagnostic("string", args))
            return
        }
        if (this.regexConstraint?.matcher.test(args.data)) {
            args.diagnostics.push(
                new RegexMismatchDiagnostic(
                    args,
                    this.regexConstraint.description ??
                        `match expression /${this.regexConstraint.matcher.source}/`
                )
            )
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

export class RegexMismatchDiagnostic extends Allows.Diagnostic<"RegexMismatch"> {
    message

    constructor(args: Allows.Args, public description: string) {
        super("RegexMismatch", args)
        // TODO: Combine versions of this diagnostic
        this.message = `'${this.data}' must ${description}.`
    }
}

export type regexConstraint = {
    matcher: RegExp
    description?: string
}

export const subtypes: Record<
    Exclude<StringKeyword, "string">,
    regexConstraint
> = {
    email: { matcher: /^(.+)@(.+)\.(.+)$/, description: "be a valid email" },
    alpha: { matcher: /^[A-Za-z]+$/, description: "include only letters" },
    alphanumeric: {
        matcher: /^[\dA-Za-z]+$/,
        description: "include only letters and digits"
    },
    lowercase: {
        matcher: /^[a-z]*$/,
        description: "include only lowercase letters"
    },
    uppercase: {
        matcher: /^[A-Z]*$/,
        description: "include only uppercase letters"
    }
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
