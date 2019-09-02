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
    @Mutation(returns => Step)
    async createStep(
        @Args() { action, selector, value }: StepInput,
        @Ctx() { photon, id }: Context
    ) {
        const step = await photon.steps.create({
            data: {
                action,
                selector,
                value,
                user: { connect: { id } }
            },
            include: {
                user: true
            }
        })
        return step
    }

    @Authorized()
    @Query(returns => [Step])
    async getSteps(@Ctx() { photon, id }: Context) {
        const steps = await photon.steps.findMany({
            where: { user: { id } },
            include: { user: true }
        })
        return steps
    }

    @Authorized()
    @Mutation(returns => Step)
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
                user: { connect: { id } }
            },
            where: {
                id: stepId
            },
            include: {
                user: true
            }
        })
        return step
    }
}
