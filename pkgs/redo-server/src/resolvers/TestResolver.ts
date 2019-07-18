import { Ctx, Mutation, Resolver, Args } from "type-graphql"
import { Test, TestInput } from "redo-model"
import { Context } from "../context"

@Resolver(of => Test)
export class TestResolver {
    @Mutation(returns => Test)
    async submitTest(
        @Args() { name, steps, tags }: TestInput,
        @Ctx() { prisma }: Context
    ) {
        const test = await prisma.createTest({
            name,
            steps: { create: [{ type: "click" }] },
            tags: { set: "bat" }
        })

        return test
    }
}
