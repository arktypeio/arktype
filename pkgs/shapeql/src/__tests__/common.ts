import { ObjectType, Field } from "type-graphql"
import { DeepRequired } from "redo-utils"

@ObjectType()
export class B {
    @Field(type => [Number])
    a: number[]
}

@ObjectType()
export class A {
    @Field()
    a: number

    @Field()
    b: B
}

@ObjectType()
export class Root {
    @Field()
    a: A

    @Field()
    b: boolean

    @Field()
    c: string

    @Field(type => [A])
    d: A[]
}

export const initialA: DeepRequired<A> = Object.freeze({
    a: 0,
    b: {
        a: [0]
    }
})

export const initialAWithTypeNames = Object.freeze({
    a: 0,
    b: {
        __typename: "B",
        a: [0]
    },
    __typename: "A"
})

export const initialRoot: DeepRequired<Root> = Object.freeze({
    a: initialA,
    b: false,
    c: "",
    d: [initialA, initialA]
})

export const initialRootWithTypeNames = Object.freeze({
    a: initialAWithTypeNames,
    b: false,
    c: "",
    d: [initialAWithTypeNames, initialAWithTypeNames],
    __typename: "Root"
} as const)
