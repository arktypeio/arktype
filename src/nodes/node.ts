import { CompiledFunction } from "../utils/compiledFunction.js"
import { In } from "./compilation.js"
import { Disjoint } from "./disjoint.js"

type NodeDefinition<rule, input> = {
    readonly kind: string
    condition(rule: rule): string
    describe(rule: rule): string
    intersect(l: rule, r: rule): rule | Disjoint
    create?(input: input): rule
    // TODO: add toType representation that would allow any arbitrary nodes to be intersected
    // TODO: Visit somehow? Could compose from multiple parts, would give more flexibility
    // compile(rule: rule, condition: string, s: CompilationState): string
}

export const defineNode =
    <rule, input = rule>() =>
    <def extends NodeDefinition<rule, input>>(def: def) => {
        const instances: {
            [condition: string]: Node
        } = {}
        const intersections: {
            [lCondition: string]: {
                [otherCondition: string]: Node | Disjoint
            }
        } = {}
        class Node {
            kind!: string
            declare condition: string
            declare allows: (data: unknown) => boolean

            constructor(public rule: rule) {
                const condition = def.condition(rule)
                if (instances[condition]) {
                    return instances[condition]
                }
                this.kind = def.kind
                this.condition = condition
                this.allows = new CompiledFunction(In, `return ${condition}`)
                instances[condition] = this
            }

            intersect(other: this) {
                if (this === other) {
                    return this
                }
                if (intersections[this.condition][other.condition]) {
                    return intersections[this.condition][other.condition]
                }
                const result = def.intersect(this.rule, other.rule)
                if (result instanceof Disjoint) {
                    intersections[this.condition][other.condition] = result
                    intersections[other.condition][this.condition] =
                        result.invert()
                    return result
                }
                const resultNode = new Node(result)
                intersections[this.condition][other.condition] = resultNode
                intersections[other.condition][this.condition] = resultNode
                return resultNode
            }
        }
        return Node
    }
