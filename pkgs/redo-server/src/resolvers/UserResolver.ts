import { Authorized, Ctx, Query, Resolver } from "type-graphql"
import { User } from "redo-model"
import { Context } from "../context"

@Resolver(of => User)
export class UserResolver {
    @Authorized()
    @Query(returns => User)
    async me(@Ctx() { photon, id }: Context) {
        return photon.users.findOne({ where: { id: id! } })
    }
}
