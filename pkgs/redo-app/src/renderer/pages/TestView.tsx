import React from "react"
import { Button, ModalView } from "redo-components"
import { RedoAppBar } from "custom"
import { Column, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"

import gql from "graphql-tag"
import { BrowserEvent, Tag, metadata, MetadataKey } from "redo-model"
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
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
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
