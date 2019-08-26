import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Test, TestInput, TestUpdate } from "@re-do/model"
import { Context } from "../context"
import { createTagsInput } from "./common"
@Resolver(of => Test)
export class TestResolver {
    @Authorized()
    @Mutation(returns => String)
    async createTest(
        @Args() { name, steps, tags }: TestInput,
        @Ctx() { photon, id }: Context
    ) {
        const test = await photon.tests.create({
            data: {
                name,
                steps: {
                    create: steps.map(step => ({
                        ...step,
                        user: { connect: { id: id! } }
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

    @Authorized()
    @Mutation(returns => String)
    async updateTest(
        @Args() { name, steps, tags }: TestUpdate,
        @Arg("id") testId: string,
        @Ctx() { photon, id }: Context
    ) {
        const test = await photon.tests.update({
            data: {
                name,
                steps: steps
                    ? {
                          create: steps.map(step => ({
                              ...step,
                              user: { connect: { id: id! } }
                          }))
                      }
                    : undefined,
                tags: {
                    create: tags ? createTagsInput(tags, id!) : tags
                }
            },
            where: { id: testId }
        })
        return test.id
    }
}
