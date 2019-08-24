import React from "react"
import { ModalView } from "redo-components"
import { RedoAppBar } from "custom"
import { Column, Tree, IconButton } from "redo-components"
import OpenInNew from "@material-ui/icons/OpenInNew"
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

export type TreeViewProps = {}

export const TreeView = ({  }: TreeViewProps) => {
    const { data } = useQuery<TestData>(GET_TESTS)
    return (
        <Column justify="center">
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {data && data.getTest ? (
                <Tree
                    labelKey="name"
                    nodeExtras={(key: string, value: any, path: string[]) => {
                        const objectType = path.slice(-1)[0]
                        return objectType in metadata ? (
                            <ModalView>
                                {{
                                    toggle: <IconButton Icon={OpenInNew} />,
                                    content: (
                                        <ObjectView
                                            value={value}
                                            key={key}
                                            type={objectType as MetadataKey}
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
