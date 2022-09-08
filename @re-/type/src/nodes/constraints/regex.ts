import { Allows } from "../base/traversal/allows.js"

export type RegexLiteralDefinition = `/${string}/`

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
