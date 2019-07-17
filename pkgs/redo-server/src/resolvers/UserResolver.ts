import { Authorized, Ctx, Query, Resolver } from "type-graphql"
import { User } from "redo-model"
import { Context } from "../context"

@Resolver(of => User)
export class UserResolver {
    @Authorized()
    @Query(returns => User)
    async me(@Ctx() { prisma, userId }: Context) {
        return prisma.user({ id: userId })
    }
}
