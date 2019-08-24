import React from "react"
import { RedoAppBar } from "custom"
import { Column, Row, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"

import gql from "graphql-tag"

const GET_TAGS = gql`
    query {
        getTag {
            name
        }
    }
`

type TagData = {
    getTag: {
        name: string
    }[]
}

export const TagView = () => {
    const { data } = useQuery<TagData>(GET_TAGS)
    return (
        <Column justify="flex-start">
            <Row>
                <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            </Row>
            {data && data.getTag ? (
                <Tree from={data.getTag} labelKey="name" />
            ) : null}
        </Column>
    )
}
