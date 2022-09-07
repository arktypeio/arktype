import { Node } from "../common.js"

export type RegexLiteralDefinition = `/${string}/`

export class RegexMismatchDiagnostic extends Node.Allows
    .Diagnostic<"RegexMismatch"> {
    message

    constructor(
        type: string,
        args: Node.Allows.Args,
        public description: string
    ) {
        super("RegexMismatch", type, args)
        this.message = `'${this.data}' must ${description}.`
    }
}

export class regexConstraint extends Node.constraint<string, string> {
    constructor(
        definition: string,
        public matcher: RegExp,
        description = `match expression /${matcher.source}/`
    ) {
        super(definition, description)
    }

    check(args: Node.Allows.Args<string>) {
        if (!this.matcher.test(args.data)) {
            args.diagnostics.push(
                new RegexMismatchDiagnostic(
                    this.definition,
                    args,
                    this.description
                )
            )
        }
    }
}
