import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Selector, SelectorInput, SelectorUpdate } from "@re-do/model"
import { Context } from "../context"

@Resolver(of => Selector)
export class SelectorResolver {
    @Authorized()
    @Mutation(returns => Selector)
    async createSelector(
        @Args() { css }: SelectorInput,
        @Ctx() { photon, id }: Context
    ) {
        const selector = await photon.selectors.create({
            data: {
                css,
                user: { connect: { id } }
            },
            include: {
                user: true
            }
        })
        return selector
    }

    @Authorized()
    @Query(returns => [Selector])
    async getSelectors(@Ctx() { photon, id }: Context) {
        const selectors = await photon.selectors.findMany({
            where: { user: { id } },
            include: { user: true }
        })
        return selectors
    }

    @Authorized()
    @Mutation(returns => Selector)
    async updateSelector(
        @Args() { css }: SelectorUpdate,
        @Arg("id") selectorId: string,
        @Ctx() { photon, id }: Context
    ) {
        const selector = await photon.selectors.update({
            data: {
                css,
                user: { connect: { id } }
            },
            where: {
                id: selectorId
            },
            include: {
                user: true
            }
        })
        return selector
    }
}
