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
// this doesn't work yet. Fix!
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
        <Column justify="center">
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
                    nodeExtras={(key: string, value: any, path: string[]) => {
                        const type = path.slice(-1)[0]
                        return type in metadata ? (
                            <ModalView>
                                {{
                                    toggle: <Button>Open modal</Button>,
                                    content: (
                                        <ObjectView
                                            value={value}
                                            key={key}
                                            type={type as MetadataKey}
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
