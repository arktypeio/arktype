import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Step, StepInput, StepUpdate } from "@re-do/model"
import { Context } from "../context"

@Resolver(of => Step)
export class StepResolver {
    @Authorized()
    @Mutation(returns => String)
    async createStep(
        @Args() { action, selector, value }: StepInput,
        @Ctx() { photon, id }: Context
    ) {
        const step = await photon.steps.create({
            data: {
                action,
                selector,
                value,
                user: { connect: { id: id! } }
            }
        })
        return step.id
    }

    @Authorized()
    @Query(returns => [Step])
    async getSteps(@Ctx() { photon, id }: Context) {
        const results = await photon.steps.findMany({
            where: { user: { id: id! } },
            include: { user: true }
        })
        return results
    }

    @Authorized()
    @Mutation(returns => String)
    async updateStep(
        @Args() { action, selector, value }: StepUpdate,
        @Arg("id") stepId: string,
        @Ctx() { photon, id }: Context
    ) {
        const step = await photon.steps.update({
            data: {
                action,
                selector,
                value,
                user: { connect: { id: id! } }
            },
            where: {
                id: stepId
            }
        })
        return step.id
    }
}
