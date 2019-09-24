import React from "react"
import { useQuery } from "@apollo/react-hooks"
import {
    Column,
    Tree,
    IconButton,
    Modal,
    Icons,
    TreeNodeContext,
    TreeNodeTransform
} from "@re-do/components"
import { metadata, MetadataKey, Test } from "@re-do/model"
import { ObjectView } from "./ObjectView"
import { RedoAppBar } from "./appBar"

const metaKeyToQueryName = (key: string) =>
    `get${key.charAt(0).toUpperCase()}${key.slice(1)}s`

const getMetadataKey = (value: any) =>
    value
        ? value.__typename
            ? value.__typename.toLowerCase() in metadata
                ? (value.__typename.toLowerCase() as MetadataKey)
                : undefined
            : undefined
        : undefined

const transformationMetadata: { [K in MetadataKey]?: TreeNodeTransform } = {
    test: ({ value: { name, ...rest } }: TreeNodeContext<Test>) => ({
        entry: [name, rest]
    })
}

const getTransforms = (context: TreeNodeContext) => {
    const metaKey = getMetadataKey(context.value)
    const customTransforms =
        metaKey && transformationMetadata[metaKey]
            ? transformationMetadata[metaKey]!(context)
            : undefined
    return { ...defaultTransforms(context), ...customTransforms }
}

const defaultTransforms: TreeNodeTransform = ({ key, value, path }) => {
    const metaKey = getMetadataKey(value)
    const extras =
        metaKey && metadata[metaKey].gql.update ? (
            <Modal>
                {{
                    toggle: <IconButton Icon={Icons.openModal} />,
                    content: (
                        <ObjectView
                            value={value}
                            path={path}
                            metaKey={metaKey}
                        />
                    )
                }}
            </Modal>
        ) : (
            undefined
        )
    const render = ["__typename", "id"].includes(key) ? null : undefined
    return { render, extras }
}

export type TreeViewProps = {
    metaKey: MetadataKey
}

export const TreeView = ({ metaKey }: TreeViewProps) => {
    const { data } = useQuery(metadata[metaKey].gql.get, {
        fetchPolicy: "no-cache"
    })
    const result = data ? data[metaKeyToQueryName(metaKey)] : undefined
    return (
        <Column justify="center">
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {result ? (
                <Tree transform={context => getTransforms(context)}>
                    {result}
                </Tree>
            ) : null}
        </Column>
    )
}
