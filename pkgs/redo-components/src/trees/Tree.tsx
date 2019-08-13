import React, { FC, useState } from "react"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import { isRecursible, ItemOrList, Entry } from "redo-utils"
import { Row, Column } from "../layouts"
import { Text } from "../text"

// Should the treeview even include the modal automatically, or should that be configurable? I'm leaning towards making it configurable.

type TreeSource = ItemOrList<Record<string, any>>

export type TreeProps<O extends TreeSource> = Omit<
    MuiTreeViewProps,
    "children"
> & {
    children: O
    nodeExtras?: JSX.Element | ((key: string, value: any) => JSX.Element)
} & (O extends any[]
        ? {
              labelKey: O extends any[] ? keyof O[number] : never
          }
        : {
              labelKey?: never
          })

export const Tree = <O extends TreeSource>({
    children,
    labelKey,
    nodeExtras
}: TreeProps<O>) => {
    const entries: Entry[] = Array.isArray(children)
        ? children.map(({ [labelKey!]: key, ...rest }) => [key, rest])
        : Object.entries(children)
    return <TreeNodes nodeExtras={nodeExtras} entries={entries} />
}

type TreeItemsProps = Pick<TreeProps<any>, "nodeExtras"> & {
    entries: Entry[]
    path?: string[]
    depth?: number
}

const TreeNodes: FC<TreeItemsProps> = ({
    entries,
    path = [],
    depth = 0,
    nodeExtras
}) => {
    const TreeNode = ({ k, v }: any) => {
        const [show, setShow] = useState(false)
        const [hovered, setHovered] = useState(false)
        const recursible = isRecursible(v)
        return (
            <Column style={{ marginLeft: depth * 5 }}>
                <Row>
                    <Text
                        style={{
                            backgroundColor:
                                hovered && recursible ? "#CDCDCD" : "white",
                            paddingLeft: 10,
                            paddingRight: 10
                        }}
                        onClick={() => setShow(!show)}
                        onMouseOver={() => setHovered(true)}
                        onMouseOut={() => setHovered(false)}
                    >
                        {recursible ? String(k) : `${String(k)}: ${String(v)}`}
                    </Text>
                    {nodeExtras
                        ? typeof nodeExtras === "function"
                            ? nodeExtras(k, v)
                            : nodeExtras
                        : null}
                </Row>
                {show && recursible ? (
                    <TreeNodes
                        path={[...path, String(k)]}
                        depth={depth + 1}
                        entries={Object.entries(v)}
                        nodeExtras={nodeExtras}
                    />
                ) : null}
            </Column>
        )
    }

    return (
        <>
            {entries.map(([k, v]) => {
                return <TreeNode k={k} v={v} />
            })}
        </>
    )
}
