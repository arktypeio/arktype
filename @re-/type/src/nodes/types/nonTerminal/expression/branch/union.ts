export type Union<Left = unknown, Right = unknown> = Branch<Left, Right, "|">

export class union extends branch {
    addMember(node: strNode) {
        this.children.push(node)
    }

    token = "|" as const

    allows(args: Nodes.Allows.Args) {
        const unionDiagnostics: DiagnosticBranchEntry[] = []
        for (const child of this.children) {
            const branchDiagnostics = new Nodes.Allows.Diagnostics()
            if (child.allows({ ...args, diagnostics: branchDiagnostics })) {
                // If any branch of a Union does not have errors,
                // we can return right away since the whole definition is valid
                return true
            }
            unionDiagnostics.push([child.toString(), branchDiagnostics])
        }
        args.diagnostics.push(
            new UnionDiagnostic(this.toString(), args, unionDiagnostics)
        )
        return false
    }

    create(args: Nodes.Create.Args) {
        const nextGenResults = this.generateChildren(args)
        if (!nextGenResults.values.length) {
            this.throwAllMembersUngeneratableError(nextGenResults.errors, args)
        }
        for (const constraint of preferredDefaults) {
            const matches = nextGenResults.values.filter((value) =>
                "value" in constraint
                    ? constraint.value === value
                    : constraint.typeOf === typeof value
            )
            if (matches.length) {
                return matches[0]
            }
        }
        throw new Error(
            `Unable to generate a value for unexpected union def ${this.toString()}.`
        )
    }

    private generateChildren(args: Nodes.Create.Args) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.create(args))
            } catch (error) {
                if (error instanceof Nodes.Create.UngeneratableError) {
                    results.errors.push(error.message)
                } else {
                    throw error
                }
            }
        }
        return results
    }

    private throwAllMembersUngeneratableError(
        errors: string[],
        args: Nodes.Create.Args
    ) {
        throw new Nodes.Create.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (args.cfg.verbose ? `:\n${errors.join("\n")}` : ".")
        )
    }
}

export type DiagnosticBranchEntry = [string, Nodes.Allows.Diagnostics]

export class UnionDiagnostic extends Nodes.Allows.Diagnostic<
    "Union",
    { expand?: boolean }
> {
    public message: string

    constructor(
        public type: string,
        args: Nodes.Allows.Args,
        public branches: DiagnosticBranchEntry[]
    ) {
        super("Union", args)
        this.message = `${Node.Allows.stringifyData(
            this.data
        )} is not assignable to any of ${this.type}${
            this.options?.expand ? ":" : "."
        }`
        if (this.options?.expand) {
            for (const [type, diagnostics] of this.branches) {
                this.message += `\n${type}: ${diagnostics.summary}`
            }
        }
    }
}
