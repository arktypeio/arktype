import React from "react"
import { RedoAppBar } from "custom"
import { Column, Row, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"

import gql from "graphql-tag"
import { objectActions } from "../components/custom"

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
        <Column>
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {data && data.getTag ? (
                <Tree labelKey="name">{data.getTag}</Tree>
            ) : null}
        </Column>
    )
}
