import React from "react"
import { useQuery } from "@apollo/react-hooks"
import { Column, Tree, IconButton, Modal, Icons } from "redo-components"
import { metadata, MetadataKey } from "redo-model"
import { ObjectView } from "./ObjectView"
import { RedoAppBar } from "./appBar"

export type TreeViewProps = {
    metaKey: MetadataKey
}

const metaKeyToQueryName = (key: string) =>
    `get${key.charAt(0).toUpperCase()}${key.slice(1)}`

const getMetadataKey = (value: any) =>
    value
        ? value.__typename
            ? value.__typename.toLowerCase() in metadata
                ? (value.__typename.toLowerCase() as MetadataKey)
                : undefined
            : undefined
        : undefined

export const TreeView = ({ metaKey }: TreeViewProps) => {
    const { data } = useQuery(metadata[metaKey].gql.get, {
        fetchPolicy: "no-cache"
    })
    const result = data ? data[metaKeyToQueryName(metaKey)] : undefined
    return (
        <Column justify="center">
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {result ? (
                <Tree
                    hideKeys={["__typename", "id"]}
                    nodeExtras={(key, value, path) => {
                        const metaKey = getMetadataKey(value)
                        return metaKey && metadata[metaKey].gql.update ? (
                            <Modal>
                                {{
                                    toggle: (
                                        <IconButton Icon={Icons.openModal} />
                                    ),
                                    content: (
                                        <ObjectView
                                            value={value}
                                            path={path}
                                            metaKey={metaKey}
                                        />
                                    )
                                }}
                            </Modal>
                        ) : null
                    }}
                >
                    {result}
                </Tree>
            ) : null}
        </Column>
    )
}
