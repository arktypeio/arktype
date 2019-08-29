import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Tag, TagInput } from "@re-do/model"
import { Context } from "../context"
@Resolver(of => Tag)
export class TagResolver {
    @Authorized()
    @Mutation(returns => String)
    async createTag(
        @Args() { name }: TagInput,
        @Ctx() { photon, id }: Context
    ) {
        const tag = await photon.tags.upsert({
            update: {
                name
            },
            where: {
                name
            },
            create: {
                name,
                user: { connect: { id: id! } }
            }
        })
        return tag.id
    }

    @Authorized()
    @Query(returns => [Tag])
    async getTags(@Ctx() { photon, id }: Context) {
        const results = await photon.tags.findMany({
            where: { user: { id: id! } }
        })
        return results
    }
}
