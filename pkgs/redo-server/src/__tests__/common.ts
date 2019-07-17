import {
    Mutation,
    Resolver,
    Args,
    ObjectType,
    Field,
    InputType,
    ArgsType
} from "type-graphql"

@ObjectType()
export class A {
    @Field(type => [String])
    a: string[]
}

@ObjectType()
export class Fake {
    @Field(type => A)
    a: A

    @Field()
    b: boolean
}

@ArgsType()
@InputType()
export class FakeInput {
    @Field()
    first: string

    @Field()
    second: boolean
}

const getFake = async () => new Fake()

@Resolver(of => Fake)
export class RootResolver {
    @Mutation(returns => Fake)
    async resolveOne(@Args() { first, second }: FakeInput) {
        return getFake()
    }

    @Mutation(returns => Fake)
    async resolveAnother(@Args() { first }: FakeInput) {
        return getFake()
    }
}

export const resolvers = [RootResolver]
