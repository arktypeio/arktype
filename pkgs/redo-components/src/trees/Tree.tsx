import React, { FC, useState } from "react"
import { isRecursible, ItemOrList } from "redo-utils"
import { Row, Column } from "../layouts"
import { Text } from "../text"
import { Icons } from "../icons"
import { IconButton } from "../buttons"

type TreeSource = ItemOrList<Record<string, any>>
type Entry = [string, any]

export type TreeProps<O extends TreeSource> = {
    children: O
    nodeExtras?:
        | JSX.Element
        | ((key: string, value: any, path: string[]) => JSX.Element | null)
    hideKeys?: (keyof O)[]
}

export type TreeNodeProps<O extends TreeSource> = TreeProps<O> & {
    entries: [string, any][]
    path: string[]
}

export const Tree = <O extends TreeSource>({
    children,
    nodeExtras,
    hideKeys
}: TreeProps<O>) => {
    const [expandedPaths, setExpandedPaths] = useState<string[][]>([])
    const Node = ({ entries }: TreeNodeProps<any>) => (
        <>
            {entries.map(([k, v]) => {
                if (hideKeys && hideKeys.includes(k)) {
                    return null
                }
                const [show, setShow] = useState(false)
                const recursible = isRecursible(v)
                // Offsets Icon width to make non-recursible and recursible text aligned
                const leafStyles = {
                    position: "relative",
                    left: recursible ? 0 : 48
                } as const
                return (
                    <div key={k}>
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
                                        Icon={
                                            show ? Icons.collapse : Icons.expand
                                        }
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
                                hideKeys={hideKeys}
                            />
                        ) : null}
                    </div>
                )
            })}
        </>
    )
}
