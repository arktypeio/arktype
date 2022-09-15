import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

export class stringNode extends terminalNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(private regex?: regexConstraint) {
        super()
    }

    toString() {
        return this.regex?.definition ?? "string"
    }

    check(args: Allows.Args) {
        if (typeof args.data === "string") {
            // this?.regex?.check(data)
            // this?.bounds?.check()
        }
        return typeof args.data === "string"
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
