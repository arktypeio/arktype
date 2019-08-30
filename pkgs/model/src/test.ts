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
import { Step, StepInput } from "./step"
import { Tag, TagInput } from "./tag"
import gql from "graphql-tag"

@OutType()
export class Test {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField({ type: as => User })
    user: User

    @OutField({ unique: true })
    name: string

    @OutField({ type: as => [Tag] })
    tags: Tag[]

    @OutField({ type: as => [Step] })
    steps: Step[]
}

@InType()
export class TestInput {
    @InField({ validate: ["filled"] })
    name: string

    // TODO: Add validation https://trello.com/c/Bs3ypPLs
    @InField({ type: as => [TagInput] })
    tags: TagInput[]

    // TODO: Add validation https://trello.com/c/Bs3ypPLs
    @InField({ type: as => [StepInput] })
    steps: StepInput[]
}

@InType()
export class TestUpdate {
    @InField({ validate: ["filled"], options: { nullable: true } })
    name?: string

    @InField({ type: as => [TagInput], options: { nullable: true } })
    tags?: TagInput[]

    @InField({ type: as => [StepInput], options: { nullable: true } })
    steps?: StepInput[]
}

export const testMetadata = createTypeMetadata({
    inType: TestInput,
    outType: Test,
    actions: [TypeAction.Run, TypeAction.Update, TypeAction.Delete],
    gql: {
        get: gql`
            query {
                getTests {
                    name
                    steps {
                        action
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
                $steps: [StepInput!]
            ) {
                updateTest(id: $id, name: $name, tags: $tags, steps: $steps) {
                    id
                }
            }
        `
    }
})
