import type { Check } from "./traverse/check/check.js"

export namespace Base {
    type ChildrenToAsts<Children extends Node[]> = {
        [K in keyof Children]: unknown
    }

    type ChildrenToStrings<Children extends Node[]> = {
        [K in keyof Children]: string
    }

    export abstract class Node<Children extends Node[] = []> {
        constructor(public children: Children) {}

        abstract check(state: Check.State): void

        abstract buildAst(childrenAsts: ChildrenToAsts<Children>): unknown
        abstract buildString(
            stringifiedChildren: ChildrenToStrings<Children>
        ): string

        toString(): string {
            return this.buildString(
                this.children.map((child) => child.toString()) as any
            )
        }

        toAst(): unknown {
            return this.buildAst(
                this.children.map((child) => child.toAst()) as any
            )
        }

        toDefinition(): unknown {
            const childDefinitions = this.children.map((child) => {
                return child.toDefinition()
            })
        }
    }
}
