import React from "react"
import { HomeActionsRow } from "custom"
import { Column, Row, Button, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

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
        <Column justify="flex-start">
            <Row>
                <Button
                    kind="secondary"
                    onClick={() => store.mutate({ page: Page.Home })}
                >
                    Home
                </Button>
                <HomeActionsRow />
            </Row>
            {data && data.getTag ? (
                <Tree labelKey="name">{data.getTag}</Tree>
            ) : null}
        </Column>
    )
}
