import React from "react"
import { HomeActionsRow } from "custom"
import {
    Column,
    Row,
    Button,
    Tree,
    FormText,
    Form,
    FormSubmit,
    AutoForm,
    Text,
    ModalView
} from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"
import {
    BrowserEvent,
    Tag,
    metadata,
    MetadataKey,
    Metadata,
    TypeAction
} from "redo-model"
import { TestInput, Test } from "redo-model"
import { actionToButton } from "../components/custom/ActionButtons"
import { ValueFrom } from "redo-utils"
import { ObjectView } from "../components/custom/ObjectView"

const GET_TESTS = gql`
    query {
        getTest {
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
`

const MODIFY_TEST = gql`
    mutation signIn($email: String!, $password: String!) {
        signIn(email: $email, password: $password) {
            token
        }
    }
`

type TestData = {
    getTest: {
        name: string
        tags: Tag[]
        steps: BrowserEvent[]
    }[]
}

export const TestView = () => {
    const { data } = useQuery<TestData>(GET_TESTS)
    return (
        <Column justify="flex-start" full>
            <Row>
                <Button
                    kind="secondary"
                    onClick={() => store.mutate({ page: Page.Home })}
                >
                    Home
                </Button>
                <HomeActionsRow />
            </Row>
            {data && data.getTest ? (
                <Tree
                    labelKey="name"
                    nodeExtras={(key: string, value: any) => {
                        return key in metadata ? (
                            <ModalView>
                                {{
                                    toggle: <Button>Open modal</Button>,
                                    content: (
                                        <ObjectView
                                            type={key as MetadataKey}
                                            value={value}
                                        />
                                    )
                                }}
                            </ModalView>
                        ) : null
                    }}
                >
                    {data.getTest}
                </Tree>
            ) : null}
        </Column>
    )
}

type CustomProps = {
    key: MetadataKey
    value: object
}

// const Custom = ({ key, value }: CustomProps) => (
//     <ModalButton open={false}>
//         <Form
//             validator={value}
//             submit={async () => {
//                 const result = await submitForm()

//                 return result
//             }}
//         >
//             {Object.entries(actionToButton).map(([k, button]) =>
//                 metadata[key].actions.includes(k as TypeAction) ? button : null
//             )}
//             <Row>
//                 <FormText name={key}>{key}</FormText>
//                 <FormSubmit>Save changes</FormSubmit>
//             </Row>
//             <Tree nodeExtras={EditableLinks}>{value as object}</Tree>
//         </Form>
//     </ModalButton>
// )

// const EditableLinks = (key: string, value: any) => {
//     return "test" == key || key == "tags" ? (
//         <ModalButton open={false}>
//             <AutoForm
//                 validator={value}
//                 contents={value}
//                 submit={async () => {
//                     const result = await submitForm()

//                     return result
//                 }}
//             />
//         </ModalButton>
//     ) : null
// }

// const submitForm = () => {}

// // {
// //     value.forEach((val: any) => {
// //         return <FormText name={val}>{val}</FormText>
// //     })
// // }
