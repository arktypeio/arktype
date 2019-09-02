import gql from "graphql-tag"
import {
    InField,
    InType,
    OutType,
    OutField,
    ID,
    TypeAction,
    createTypeMetadata
} from "./common"
import { User } from "./user"

@OutType()
export class Step {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    action: string

    @OutField()
    selector: string

    @OutField()
    value: string

    @OutField({ type: as => User })
    user: User
}

@InType()
export class StepInput {
    @InField()
    action: string

    @InField()
    selector: string

    @InField()
    value: string
}

@InType()
export class StepUpdate {
    @InField({ options: { nullable: true } })
    action?: string

    @InField({ options: { nullable: true } })
    selector?: string

    @InField({ options: { nullable: true } })
    value?: string
}

export const stepMetadata = createTypeMetadata({
    inType: StepInput,
    outType: Step,
    actions: [TypeAction.Update, TypeAction.Delete],
    gql: {
        get: gql`
            query {
                getSteps {
                    action
                    selector
                    value
                }
            }
        `,
        update: gql`
            mutation updateStep(
                $id: String!
                $action: String
                $selector: String
                $value: String
            ) {
                updateStep(
                    id: $id
                    action: $action
                    selector: $selector
                    value: $value
                ) {
                    id
                }
            }
        `
    }
})
