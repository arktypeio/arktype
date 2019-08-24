import React, { FC, useState } from "react"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import { isRecursible, ItemOrList, Entry } from "redo-utils"
import { Row, Column } from "../layouts"
import { Text } from "../text"
import { Button } from "@material-ui/core"
import { FormText } from "../forms"

// Should the treeview even include the modal automatically, or should that be configurable? I'm leaning towards making it configurable.

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
        const useLabelKey =
            typeof v === "string" ? false : Object.entries(v).keys()
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
                        entries={Array.isArray(v) ? v : Object.entries(v)}
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
                return <TreeNode k={k} v={v} />
            })}
        </>
    )
}
