import { Authorized, Ctx, Mutation, Query, Resolver, Args } from "type-graphql"
import { Test, TestInput } from "redo-model"
import { Context } from "../context"
@Resolver(of => Test)
export class TestResolver {
    @Authorized()
    @Mutation(returns => String)
    async submitTest(
        @Args() { name, steps, tags }: TestInput,
        @Ctx() { photon, id }: Context
    ) {
        const test = await photon.tests.create({
            data: {
                name,
                steps: {
                    create: steps
                },
                tags: { set: tags },
                user: { connect: { id: id! } }
            }
        })
        return test.id
    }
    @Authorized()
    @Query(returns => [Test])
    async getTest(@Ctx() { photon, id }: Context) {
        const results = await photon.tests.findMany({
            where: { user: { id: id! } },
            include: { steps: true, user: true }
        })
        return results
    }
}
