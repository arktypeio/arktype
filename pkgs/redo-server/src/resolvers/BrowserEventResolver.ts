import { Authorized, Ctx, Mutation, Query, Resolver, Args } from "type-graphql"
import { Test, TestInput, BrowserEvent, BrowserEventInput } from "redo-model"
import { Context } from "../context"
@Resolver(of => BrowserEvent)
export class BrowserEventResolver {
    @Authorized()
    @Mutation(returns => String)
    async submitBrowserEvent(
        @Args() { type, selector, value }: BrowserEventInput,
        @Ctx() { photon, id }: Context
    ) {
        const test = await photon.browserEvents.create({
            data: {
                type,
                selector,
                value,
                test: { connect: { id: id! } },
                tags: { connect: { id: id! } },
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
