import { Allows } from "../../allows.js"
import type { boundableNode, bounds } from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/common.js"
import { terminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class stringNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(
        private definition: string,
        private regexConstraints: regexConstraint[]
    ) {
        super()
    }

    toString() {
        return this.bounds
            ? this.bounds.boundString(this.definition)
            : this.definition
    }

    override get tree() {
        return this.bounds
            ? this.bounds.boundTree(this.definition)
            : this.definition
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "string") {
            args.diagnostics.push(new KeywordDiagnostic("string", args))
            return
        }
        for (const { description, matcher } of this.regexConstraints) {
            if (!matcher.test(args.data)) {
                args.diagnostics.push(
                    new RegexMismatchDiagnostic(
                        args,
                        description ?? `match expression /${matcher.source}/`
                    )
                )
            }
        }
        this.bounds?.check(args as Allows.Args<string>)
    }

    generate() {
        if (this.regexConstraints.length || this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return ""
    }
}

export class RegexMismatchDiagnostic extends Allows.Diagnostic<"RegexMismatch"> {
    message

    constructor(args: Allows.Args, public description: string) {
        super("RegexMismatch", args)
        this.message = `'${this.data}' must ${description}.`
    }
}

export type regexConstraint = {
    matcher: RegExp
    description?: string
}

export class stringKeywordNode extends stringNode {
    constructor() {
        super("string", [])
    }
}

export class emailKeywordNode extends stringNode {
    constructor() {
        super("email", [
            { matcher: /^(.+)@(.+)\.(.+)$/, description: "be a valid email" }
        ])
    }
}
export class alphaKeywordNode extends stringNode {
    constructor() {
        super("alpha", [
            { matcher: /^[A-Za-z]+$/, description: "include only letters" }
        ])
    }
}
export class alphanumericKeywordNode extends stringNode {
    constructor() {
        super("alphanumeric", [
            {
                matcher: /^[\dA-Za-z]+$/,
                description: "include only letters and digits"
            }
        ])
    }
}
export class lowerKeywordNode extends stringNode {
    constructor() {
        super("lower", [
            {
                matcher: /^[a-z]*$/,
                description: "include only lowercase letters"
            }
        ])
    }
}
export class upperKeywordNode extends stringNode {
    constructor() {
        super("upper", [
            {
                matcher: /^[A-Z]*$/,
                description: "include only uppercase letters"
            }
        ])
    }
}
export const stringKeywords = {
    string: stringKeywordNode,
    email: emailKeywordNode,
    alpha: alphaKeywordNode,
    alphanumeric: alphanumericKeywordNode,
    lower: lowerKeywordNode,
    upper: upperKeywordNode
}

export type StringKeyword = keyof typeof stringKeywords
