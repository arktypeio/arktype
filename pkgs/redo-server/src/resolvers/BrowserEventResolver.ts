import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { BrowserEvent, BrowserEventInput, BrowserEventUpdate } from "redo-model"
import { Context } from "../context"

@Resolver(of => BrowserEvent)
export class BrowserEventResolver {
    @Authorized()
    @Mutation(returns => String)
    async createBrowserEvent(
        @Args() { type, selector, value }: BrowserEventInput,
        @Ctx() { photon, id }: Context
    ) {
        const browserEvent = await photon.browserEvents.create({
            data: {
                type,
                selector,
                value,
                user: { connect: { id: id! } }
            }
        })
        return browserEvent.id
    }

    @Authorized()
    @Query(returns => [BrowserEvent])
    async getBrowserEvent(@Ctx() { photon, id }: Context) {
        const results = await photon.browserEvents.findMany({
            where: { user: { id: id! } },
            include: { user: true }
        })
        return results
    }

    @Authorized()
    @Mutation(returns => String)
    async updateBrowserEvent(
        @Args() { type, selector, value }: BrowserEventUpdate,
        @Arg("id") browserEventId: string,
        @Ctx() { photon, id }: Context
    ) {
        const browserEvent = await photon.browserEvents.update({
            data: {
                type,
                selector,
                value,
                user: { connect: { id: id! } }
            },
            where: {
                id: browserEventId
            }
        })
        return browserEvent.id
    }
}
