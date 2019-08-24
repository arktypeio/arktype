import React from "react"
import { RedoAppBar } from "custom"
import { Column, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"


import gql from "graphql-tag"
import { BrowserEvent, Tag } from "redo-model"

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
                <Tree from={data.getTest} labelKey="name" />
            ) : null}
        </Column>
    )
}
