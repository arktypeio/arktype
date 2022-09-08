import { constraint, Node } from "../common.js"

export type RegexLiteralDefinition = `/${string}/`

export class RegexMismatchDiagnostic extends Node.Allows
    .Diagnostic<"RegexMismatch"> {
    message

    constructor(args: Node.Allows.Args, public description: string) {
        super("RegexMismatch", args)
        this.message = `'${this.data}' must ${description}.`
    }
}

export class regexConstraint extends constraint<string, string> {
    constructor(
        definition: string,
        public matcher: RegExp,
        public description = `match expression /${matcher.source}/`
    ) {
        super(definition)
    }

    check(args: Node.Allows.Args<string>) {
        if (!this.matcher.test(args.data)) {
            args.diagnostics.push(
                new RegexMismatchDiagnostic(args, this.description)
            )
        }
    }
}
