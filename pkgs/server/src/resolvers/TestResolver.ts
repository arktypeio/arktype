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
import { createTagConnector } from "./common"
@Resolver(of => Test)
export class TestResolver {
    @Authorized()
    @Mutation(returns => Test)
    async createTest(
        @Args() { name, steps, tags }: TestInput,
        @Ctx() context: Context
    ) {
        const { photon, id } = context
        const test = await photon.tests.create({
            data: {
                name,
                steps: {
                    create: steps.map(step => ({
                        ...step,
                        user: { connect: { id } }
                    }))
                },
                tags: await createTagConnector(tags, context),
                user: { connect: { id } }
            },
            include: { tags: true, steps: true }
        })
        return test
    }
    @Authorized()
    @Query(returns => [Test])
    async getTests(@Ctx() { photon, id }: Context) {
        const tests = await photon.tests.findMany({
            where: { user: { id } },
            include: { steps: true, user: true, tags: true }
        })
        return tests
    }

    @Authorized()
    @Mutation(returns => Test)
    async updateTest(
        @Args() { name, steps, tags }: TestUpdate,
        @Arg("id") testId: string,
        @Ctx() context: Context
    ) {
        const { photon, id } = context
        const test = await photon.tests.update({
            data: {
                name,
                steps: steps
                    ? {
                          create: steps.map(step => ({
                              ...step,
                              user: { connect: { id } }
                          }))
                      }
                    : undefined,
                tags: tags ? await createTagConnector(tags, context) : undefined
            },
            where: { id: testId },
            include: { tags: true, steps: true }
        })
        return test
    }
}
