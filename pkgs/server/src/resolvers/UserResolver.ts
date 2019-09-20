import { Authorized, Ctx, Query, Resolver } from "type-graphql"
import { User } from "@re-do/model"
import { Context } from "../context"

@Resolver(of => User)
export class UserResolver {
    @Authorized()
    @Query(returns => User)
    async me(@Ctx() { photon, id }: Context) {
        return photon.users.findOne({
            where: { id },
            include: {
                tags: true,
                tests: {
                    include: {
                        tags: true,
                        steps: { include: { selector: true } }
                    }
                },
                steps: {
                    include: { selector: true }
                },
                selectors: true
            }
        })
    }
}
