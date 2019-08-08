import { Authorized, Ctx, Mutation, Query, Resolver, Args } from "type-graphql"
import { Test, TestInput, TagInput } from "redo-model"
import { Context } from "../context"
import { createTagsInput } from "./common"
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
                    create: steps.map(({ tags, ...rest }) => ({
                        ...rest,
                        user: { connect: { id: id! } },
                        tags: { create: createTagsInput(tags, id!) }
                    }))
                },
                tags: {
                    create: createTagsInput(tags, id!)
                },
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
            include: { steps: true, user: true, tags: true }
        })
        return results
    }
}
