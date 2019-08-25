import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Tag, TagInput } from "redo-model"
import { Context } from "../context"
@Resolver(of => Tag)
export class TagResolver {
    @Authorized()
    @Mutation(returns => String)
    async createTag(
        @Args() { name }: TagInput,
        @Ctx() { photon, id }: Context
    ) {
        const tag = await photon.tags.create({
            data: {
                name,
                user: { connect: { id: id! } }
            }
        })
        return tag.id
    }

    @Authorized()
    @Query(returns => [Tag])
    async getTag(@Ctx() { photon, id }: Context) {
        const results = await photon.tags.findMany({
            where: { user: { id: id! } },
            include: { user: true }
        })
        return results
    }
}
