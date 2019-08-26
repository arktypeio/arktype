import React from "react"
import { useQuery } from "@apollo/react-hooks"
import { Column, Tree, IconButton, Modal, Icons } from "@re-do/components"
import { metadata, MetadataKey } from "@re-do/model"
import { ObjectView } from "./ObjectView"
import { RedoAppBar } from "./appBar"

export type TreeViewProps = {
    metaKey: MetadataKey
}

export const metaKeyToQueryName = (key: string) =>
    `get${key.charAt(0).toUpperCase()}${key.slice(1)}`

export const extractMetaKey = (
    key: string,
    value: any,
    path: string[]
): MetadataKey | undefined => {
    // @ts-ignore
    if (
        value &&
        value.__typename &&
        value.__typename.toLowerCase() in metadata
    ) {
        return value.__typename.toLowerCase() as MetadataKey
    } else if (
        Array.isArray(value) &&
        value.length &&
        value[0].__typename &&
        value[0].__typename.toLowerCase() in metadata
    ) {
        return value[0].__typename.toLowerCase() as MetadataKey
    }
    return undefined
}

export const TreeView = ({ metaKey }: TreeViewProps) => {
    const { data } = useQuery(metadata[metaKey].gql.get)
    const result = data ? data[metaKeyToQueryName(metaKey)] : undefined
    return (
        <Column justify="center">
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {result ? (
                <Tree
                    labelKey="name"
                    hideKeys={["__typename", "id"]}
                    nodeExtras={(key: string, value: any, path: string[]) => {
                        const metaKey = extractMetaKey(key, value, path)
                        return metaKey && metadata[metaKey].gql.update ? (
                            <Modal>
                                {{
                                    toggle: (
                                        <IconButton Icon={Icons.openModal} />
                                    ),
                                    content: (
                                        <ObjectView
                                            value={value}
                                            name={key}
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
