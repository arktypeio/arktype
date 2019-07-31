import { Ctx, Mutation, Query, Resolver, Args } from "type-graphql"
import { Test, TestInput } from "redo-model"
import { Context } from "../context"

@Resolver(of => Test)
export class TestResolver {
    @Mutation(returns => Test)
    async submitTest(
        @Args() { name, steps, tags }: TestInput,
        @Ctx() { photon }: Context
    ) {
        const test = await photon.tests.create({
            data: {
                name,
                steps: {
                    create: [{ type: "click", selector: "#some", value: "" }]
                },
                tags: { set: "bat" }
            }
        })
        return test
    }

    @Query(returns => [Test])
    async getTest(@Ctx() { photon }: Context) {
        const results = await photon.tests.findMany()
        console.log(results)
        return results
    }
}
