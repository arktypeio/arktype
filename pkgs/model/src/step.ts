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
import { Selector, SelectorInput, SelectorUpdate } from "./selector"

@OutType()
export class Step {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    action: string

    @OutField()
    selector: Selector

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
    selector: SelectorInput

    @InField()
    value: string
}

@InType()
export class StepUpdate {
    @InField({ options: { nullable: true } })
    action?: string

    @InField({ options: { nullable: true } })
    selector?: SelectorInput

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
                    selector {
                        css
                    }
                    value
                }
            }
        `,
        update: gql`
            mutation updateStep(
                $id: String!
                $action: String
                $selector: SelectorInput
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
