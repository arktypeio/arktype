import gql from "graphql-tag"
import {
    InField,
    InType,
    OutType,
    OutField,
    ID,
    TypeMetadata,
    TypeAction
} from "./common"
import { User } from "./user"

@OutType()
export class Step {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    key: string

    @OutField()
    selector: string

    @OutField()
    value: string

    @OutField()
    user: User
}

@InType()
export class StepInput {
    @InField()
    key: string

    @InField()
    selector: string

    @InField()
    value: string
}

@InType()
export class StepUpdate {
    @InField({ options: { nullable: true } })
    key?: string

    @InField({ options: { nullable: true } })
    selector?: string

    @InField({ options: { nullable: true } })
    value?: string
}

export const stepMetadata: TypeMetadata = {
    inType: StepInput,
    outType: Step,
    actions: [TypeAction.Update, TypeAction.Delete],
    gql: {
        get: gql`
            query {
                getStep {
                    key
                    selector
                    value
                }
            }
        `
    }
}
