export type Intersection<Left = unknown, Right = unknown> = Branch<
    Left,
    Right,
    "&"
>

export class intersection extends branch {
    addMember(node: strNode) {
        this.children.push(node)
    }

    token = "&" as const

    allows(args: Nodes.Allows.Args) {
        for (const branch of this.children) {
            if (!branch.allows(args)) {
                return false
            }
        }
        return true
    }

    create() {
        throw new Nodes.Create.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
