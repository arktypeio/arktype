import { Ctx, Mutation, Query, Resolver, Args } from "type-graphql"
import { Test, TestInput } from "redo-model"
import { Context } from "../context"
import { BrowserEvent } from "@generated/photon"

@Resolver(of => Test)
export class TestResolver {
    @Mutation(returns => String)
    async submitTest(
        @Args() { name, steps, tags }: TestInput,
        @Ctx() { photon }: Context
    ) {
        const test = await photon.tests.create({
            data: {
                name,
                steps: {
                    create: steps
                },
                tags: { set: tags }
            }
        })
        return test.id
    }

    @Query(returns => [Test])
    async getTest(@Ctx() { photon }: Context) {
        const results = await photon.tests.findMany({
            include: { steps: true }
        })
        return results
    }
}
