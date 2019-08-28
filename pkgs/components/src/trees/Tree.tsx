import React, { useState } from "react"
import { isRecursible } from "@re-do/utils"
import { Row } from "../layouts"
import { Text } from "../text"
import { Icons } from "../icons"
import { IconButton } from "../buttons"

type TreeSource = Record<string, any>

export type TreeProps<O extends TreeSource> = {
    children: O
    nodeExtras?:
        | JSX.Element
        | ((key: string, value: any, path: string) => JSX.Element | null)
    transform?: (treeSource: any) => any
    hideKeys?: string[]
}

type NodeProps = {
    source: any
    parentPath: string
}

export const Tree = <O extends TreeSource>({
    children,
    nodeExtras,
    transform,
    hideKeys
}: TreeProps<O>) => {
    const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>(
        {}
    )
    const Node = ({ source, parentPath }: NodeProps) => (
        <>
            {Object.entries(source).map(([k, v]) => {
                if (hideKeys && hideKeys.includes(k)) {
                    return null
                }
                const value = transform ? transform(v) : v
                const path = `${parentPath}${String(k)}/`
                const recursible = isRecursible(value)
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
                                left: (path.split("/").length - 1) * 32
                            }}
                        >
                            <Row
                                align="center"
                                width="fit-content"
                                onClick={() =>
                                    setExpandedPaths({
                                        ...expandedPaths,
                                        [path]: !expandedPaths[path]
                                    })
                                }
                            >
                                {recursible ? (
                                    <IconButton
                                        Icon={
                                            expandedPaths[path]
                                                ? Icons.collapse
                                                : Icons.expand
                                        }
                                    />
                                ) : null}
                                <Text style={leafStyles}>
                                    {recursible
                                        ? String(k)
                                        : `${String(k)}: ${String(value)}`}
                                </Text>
                            </Row>
                            <div style={leafStyles}>
                                {nodeExtras
                                    ? typeof nodeExtras === "function"
                                        ? nodeExtras(k, value, path)
                                        : nodeExtras
                                    : null}
                            </div>
                        </Row>
                        {expandedPaths[path] && recursible ? (
                            <Node source={value} parentPath={path} />
                        ) : null}
                    </div>
                )
            })}
        </>
    )
    return (
        <Node
            source={transform ? transform(children) : children}
            parentPath={""}
        />
    )
}
