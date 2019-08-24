import React, { FC, useState } from "react"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import { isRecursible, ItemOrList, Entry } from "redo-utils"
import { Row, Column } from "../layouts"
import { Text } from "../text"
import { Button } from "@material-ui/core"
import { FormText } from "../forms"

type TreeSource = ItemOrList<Record<string, any>>

export type TreeProps<O extends TreeSource> = Omit<
    MuiTreeViewProps,
    "children"
> & {
    children: O
    nodeExtras?:
        | JSX.Element
        | ((key: string, value: any, path: string[]) => JSX.Element | null)
} & (O extends any[]
        ? {
              labelKey: keyof O[number]
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
    return (
        <TreeNodes
            nodeExtras={nodeExtras}
            entries={entries}
            labelKey={labelKey}
        />
    )
}

type TreeNodesProps = Pick<TreeProps<any>, "nodeExtras" | "labelKey"> & {
    entries: Entry[]
    path?: string[]
    depth?: number
}

const TreeNodes: FC<TreeNodesProps> = ({
    entries,
    path = [],
    depth = 0,
    nodeExtras,
    labelKey
}) => {
    type TreeNodeProps = {
        k: any
        v: Record<string, any> | string
    }

    const TreeNode = ({ k, v }: TreeNodeProps) => {
        const [state, setState] = useState({ show: false, hovered: false })
        const { show, hovered } = state
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
                        onClick={() => setState({ ...state, show: !show })}
                        onMouseOver={() =>
                            setState({ ...state, hovered: true })
                        }
                        onMouseOut={() =>
                            setState({ ...state, hovered: false })
                        }
                    >
                        {recursible ? String(k) : `${String(k)}: ${String(v)}`}
                    </Text>
                    {nodeExtras
                        ? typeof nodeExtras === "function"
                            ? nodeExtras(k, v, path)
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
    // I want code that determines if entries is an array of tuples of number, any

    return (
        <>
            {entries.map(([k, v]) => {
                console.log(entries)
                console.log(v)
                //TODO find a more robust way of handling arrays in tree.
                const { name } = isNumeric(k) ? v : false
                return name ? (
                    <TreeNode k={name} v={v} />
                ) : (
                    <TreeNode k={k} v={v} />
                )
            })}
        </>
    )
}
// this is copied from Stack Overflow
function isNumeric(input: any) {
    return input - 0 == input && ("" + input).trim().length > 0
}
