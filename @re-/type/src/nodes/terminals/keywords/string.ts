import { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import type { Constraint } from "../../constraints/constraint.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { TerminalConstructorArgs } from "../terminal.js"
import { TerminalNode } from "../terminal.js"

export type RegexLiteralDefinition = `/${string}/`
export type StringTypedDefinition = StringKeyword | RegexLiteralDefinition

export class StringNode extends TerminalNode implements BoundableNode {
    regex?: RegexConstraint
    bounds?: BoundConstraint

    constructor(...args: TerminalConstructorArgs) {
        super(...args)
        if (this.definitionIsKeyOf(subtypes)) {
            this.regex = subtypes[this.definition]
        } else if (this.definition.match("/.*/")) {
            this.regex = new RegexConstraint(
                new RegExp(this.definition.slice(1, -1)),
                this.definition,
                `match expression ${this.definition}`
            )
        }
    }

    check(args: Allows.Args) {
        if (!Allows.dataIsOfType(args, "string")) {
            args.diagnostics.add("keyword", args, {
                definition: this.definition,
                parentKeyword:
                    this.definition === "string" ? undefined : "string",
                reason: "Must be a string"
            })
            return
        }
        this.regex?.check(args)
        this.bounds?.check(args)
    }

    generate() {
        if (this.regex || this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return ""
    }
}

export class RegexConstraint implements Constraint {
    constructor(
        public expression: RegExp,
        public definition: string,
        public description: string
    ) {}

    check(args: Allows.Args<string>) {
        if (this.expression.test(args.data)) {
            args.diagnostics.add("regex", this.definition, args, {
                expression: this.expression,
                reason: this.description
            })
        }
    }
}

export type RegexDiagnostic = Allows.DefineDiagnostic<
    "regex",
    {
        definition: ""
        expression: RegExp
    }
>

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
