import { Allows } from "../../allows.js"
import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import type { Constraint } from "../../constraints/constraint.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { TerminalConstructorArgs } from "../terminal.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class StringNode
    extends TerminalNode<StringTypedDefinition>
    implements BoundableNode
{
    bounds: BoundConstraint | null = null
    regex?: RegexConstraint

    constructor(...args: TerminalConstructorArgs<StringTypedDefinition>) {
        super(...args)
        if (this.definition === "string") {
            return
        }
        if (this.definitionIsKeyOf(stringSubtypes)) {
            this.regex = stringSubtypes[this.definition]
        } else {
            this.regex = new RegexConstraint(
                new RegExp(this.definition.slice(1, -1)),
                this.definition,
                `Must match expression ${this.definition}`
            )
        }
    }

    check(args: Allows.Args) {
        if (!Allows.dataIsOfType(args, "string")) {
            if (this.definition === "string") {
                addTypeKeywordDiagnostic(args, "string", "Must be a string")
            } else {
                addTypeKeywordDiagnostic(
                    args,
                    this.definition,
                    "Must be a string",
                    "string"
                )
            }
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
        private definition: StringSubtypeDefinition,
        private description: string
    ) {}

    check(args: Allows.Args<string>) {
        if (!this.expression.test(args.data)) {
            args.diagnostics.add("regex", this.description, args, {
                definition: this.definition,
                data: args.data,
                actual: `"${args.data}"`,
                expression: this.expression
            })
        }
    }
}

export type RegexDiagnostic = Allows.DefineDiagnostic<
    "regex",
    {
        definition: StringSubtypeDefinition
        data: string
        expression: RegExp
        actual: `"${string}"`
    }
>

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
