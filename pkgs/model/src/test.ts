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
import { BrowserEvent, BrowserEventInput } from "./browserEvent"
import { Tag, TagInput } from "./tag"
import gql from "graphql-tag"

@InType()
export class TestInput {
    @InField({ validate: ["filled"] })
    name: string

    // TODO: Add validation https://trello.com/c/Bs3ypPLs
    @InField({ type: as => [TagInput] })
    tags: TagInput[]

    // TODO: Add validation https://trello.com/c/Bs3ypPLs
    @InField({ type: as => [BrowserEventInput] })
    steps: BrowserEventInput[]
}

@InType()
export class TestUpdate {
    @InField({ validate: ["filled"], options: { nullable: true } })
    name?: string

    @InField({ type: as => [TagInput], options: { nullable: true } })
    tags?: TagInput[]

    @InField({ type: as => [BrowserEventInput], options: { nullable: true } })
    steps?: BrowserEventInput[]
}

@OutType()
export class Test {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    user: User

    @OutField()
    name: string

    @OutField({ type: as => [Tag] })
    tags: Tag[]

    @OutField({ type: as => [BrowserEvent] })
    steps: BrowserEvent[]
}

export const testMetadata: TypeMetadata = {
    actions: [TypeAction.Run, TypeAction.Update, TypeAction.Delete],
    gql: {
        get: gql`
            query {
                getTest {
                    id
                    name
                    steps {
                        type
                        selector
                        value
                    }
                    tags {
                        name
                    }
                }
            }
        `,
        update: gql`
            mutation updateTest(
                $id: String!
                $name: String
                $tags: [TagInput!]
                $steps: [BrowserEventInput!]
            ) {
                updateTest(id: $id, name: $name, tags: $tags, steps: $steps)
            }
        `
    },
    inType: TestInput,
    outType: Test
}
