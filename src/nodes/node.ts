import { CompiledFunction } from "../utils/compiledFunction.js"
import { Disjoint } from "./disjoint.js"

export type SubclassNode = {
    new (rule: never): BaseNode<any>
    readonly kind: string
    compile(rule: never): string[]
}

const intersections: {
    [kind: string]: {
        [lCondition: string]: {
            [rCondition: string]: BaseNode<any> | Disjoint
        }
    }
} = {}

const instances: {
    [kind: string]: { [condition: string]: BaseNode<any> }
} = {}

export abstract class BaseNode<subclass extends SubclassNode> {
    kind!: string
    allows!: (data: unknown) => boolean
    condition!: string
    subconditions!: string[]
    declare prototype: subclass

    constructor(public rule: Parameters<subclass["compile"]>[0]) {
        const subconditions = this.prototype.compile(rule)
        const condition = subconditions.join(" && ")
        if (instances[this.prototype.kind]) {
            return instances[this.prototype.kind] as never
        }
        this.condition = condition
        this.subconditions = subconditions
        this.allows = new CompiledFunction(`return ${condition}`)
        this.kind = this.prototype.kind
        Object.freeze(this)
    }

    abstract computeIntersection(other: this): this["rule"] | Disjoint

    intersect(other: this): this | Disjoint {
        if (this === (other as unknown)) {
            return this
        }
        if (intersections[this.kind][this.condition][other.condition]) {
            return intersections[this.kind][this.condition][
                other.condition
            ] as never
        }
        const result = this.computeIntersection(other)
        if (result instanceof Disjoint) {
            intersections[this.kind][this.condition][other.condition] = result
            intersections[this.kind][other.condition][this.condition] =
                result.invert()
            return result
        }
        const nodeResult = new this.prototype(result) as this
        intersections[this.kind][this.condition][other.condition] = nodeResult
        intersections[this.kind][other.condition][this.condition] = nodeResult
        return nodeResult
    }
}

// export const defineNode = <rule, instance extends BaseNode<rule>>(
//     node: (new (
//         ...args: ConstructorParameters<typeof BaseNode<rule>>
//     ) => instance) & {
//         compile(rule: rule): string[]
//     }
// ) => {
//     const instances: {
//         [condition: string]: instance
//     } = {}

//     const create = (rule: rule): instance => {
//         const subconditions = node.compile(rule)
//         const condition = subconditions.join(" && ") ?? "true"
//         if (instances[condition]) {
//             return instances[condition]
//         }
//         const instance = new node(rule, condition, subconditions, create)
//         instances[condition] = instance
//         return instance
//     }
//     return create
// }
