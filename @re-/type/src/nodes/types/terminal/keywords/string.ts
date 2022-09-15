import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

export class stringNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(private regex?: regexConstraint) {
        super()
    }

    private baseToString() {
        return this.regex?.definition ?? "string"
    }

    toString() {
        return this.bounds
            ? this.bounds.boundString(this.baseToString())
            : this.baseToString()
    }

    override get tree() {
        return this.bounds
            ? this.bounds.boundTree(this.baseToString())
            : this.baseToString()
    }

    check(args: Allows.Args) {
        if (typeof args.data !== "string") {
            // TODO: Improve error message to indicate subtype
            args.diagnostics.push(
                new Allows.UnassignableDiagnostic(this.toString(), args)
            )
            return false
        }
        // TODO: Ensure multiple errors at path is ok
        this.regex?.check(args as Allows.Args<string>)
        this.bounds?.check(args as Allows.Args<string>)
        return true
    }

    create() {
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

export class regexConstraint {
    constructor(
        public definition: string,
        public matcher: RegExp,
        public description = `match expression /${matcher.source}/`
    ) {}

    check(args: Allows.Args<string>) {
        if (!this.matcher.test(args.data)) {
            args.diagnostics.push(
                new RegexMismatchDiagnostic(args, this.description)
            )
        }
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

export type StringKeyword = keyof typeof stringKeywords
