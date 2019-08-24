import React, { FC, useState } from "react"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import { isRecursible, ItemOrList } from "redo-utils"
import { Row, Column } from "../layouts"
import { Text } from "../text"
import { Icons } from "../icons"
import { IconButton } from "../buttons"

type TreeSource = ItemOrList<Record<string, any>>
type Entry = [string, any]

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
        <TreeNode
            entries={entries}
            path={[]}
            nodeExtras={nodeExtras}
            labelKey={labelKey}
        />
    )
}

type TreeNodesProps = Pick<TreeProps<any>, "nodeExtras" | "labelKey"> & {
    entries: Entry[]
    path: string[]
}

const TreeNode = ({ entries, path, nodeExtras }: TreeNodesProps) => (
    <>
        {entries.map(([k, v]) => {
            const [show, setShow] = useState(false)
            const recursible = isRecursible(v)
            // Offsets Icon width to make non-recursible and recursible text aligned
            const leafStyles = {
                position: "relative",
                left: recursible ? 0 : 48
            } as const
            return (
                <>
                    <Row
                        align="center"
                        style={{
                            position: "relative",
                            left: path.length * 32
                        }}
                    >
                        <Row
                            align="center"
                            width="fit-content"
                            onClick={() => setShow(!show)}
                        >
                            {recursible ? (
                                <IconButton
                                    Icon={show ? Icons.collapse : Icons.expand}
                                />
                            ) : null}
                            <Text style={leafStyles}>
                                {recursible
                                    ? String(k)
                                    : `${String(k)}: ${String(v)}`}
                            </Text>
                        </Row>
                        <div style={leafStyles}>
                            {nodeExtras
                                ? typeof nodeExtras === "function"
                                    ? nodeExtras(k, v, path)
                                    : nodeExtras
                                : null}
                        </div>
                    </Row>
                    {show && recursible ? (
                        <TreeNode
                            entries={Object.entries(v)}
                            path={[...path, String(k)]}
                            nodeExtras={nodeExtras}
                        />
                    ) : null}
                </>
            )
        })}
    </>
)
