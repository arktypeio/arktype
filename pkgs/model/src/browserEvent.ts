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
export class BrowserEvent {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    type: string

    @OutField()
    selector: string

    @OutField()
    value: string

    @OutField()
    user: User
}
@InType()
export class BrowserEventInput {
    @InField()
    type: string

    @InField()
    selector: string

    @InField()
    value: string
}

@InType()
export class BrowserEventUpdate {
    @InField({ options: { nullable: true } })
    type?: string

    @InField({ options: { nullable: true } })
    selector?: string

    @InField({ options: { nullable: true } })
    value?: string
}

export const browserEventMetadata: TypeMetadata = {
    inType: BrowserEventInput,
    outType: BrowserEvent,
    actions: [TypeAction.Update, TypeAction.Delete],
    gql: {
        get: gql`
            query {
                getBrowserEvent {
                    selector
                    type
                    value
                }
            }
        `
    }
}
