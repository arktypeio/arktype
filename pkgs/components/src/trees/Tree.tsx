import React, { useState } from "react"
import { isRecursible } from "@re-do/utils"
import { Row } from "../layouts"
import { Text } from "../text"
import { Icons } from "../icons"
import { Button } from "../buttons"

type TreeSource = Record<string, any>

export type TreeNodeContext<T = any> = {
    key: string
    value: T
    path: string
}

export type TreeNodeTransform<T = any> = (
    context: TreeNodeContext
) => TreeNodeTransformation<T>

export type TreeNodeTransformation<T = any> = {
    entry?: [string, T]
    render?: JSX.Element | null
    extras?: JSX.Element
}

export type TreeProps<O extends TreeSource> = {
    source: O
    transform?: TreeNodeTransform
}

type NodeProps = {
    source: any
    parentPath: string
}

export const Tree = <O extends TreeSource>({
    source,
    transform
}: TreeProps<O>) => {
    const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>(
        {}
    )
    const Node = ({ source, parentPath }: NodeProps) => (
        <>
            {Object.entries(source).map(([key, value]) => {
                const path = `${parentPath}${String(key)}/`
                const context = { key, value, path }
                const {
                    entry: [renderKey, renderValue],
                    render: renderAs,
                    extras: renderWith
                } = {
                    entry: [key, value],
                    render: undefined,
                    extras: undefined,
                    ...(transform ? transform(context) : undefined)
                }
                if (renderAs !== undefined) {
                    return renderAs
                }
                const recursible = isRecursible(renderValue)
                // Offsets Icon width to make non-recursible and recursible text aligned
                const leafStyles = {
                    position: "relative",
                    left: recursible ? 0 : 48
                } as const
                return (
                    <div key={renderKey}>
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
                                    <Button
                                        Icon={
                                            expandedPaths[path]
                                                ? Icons.collapse
                                                : Icons.expandRight
                                        }
                                    />
                                ) : null}
                                <Text style={leafStyles}>
                                    {recursible
                                        ? String(renderKey)
                                        : `${String(renderKey)}: ${String(
                                              renderValue
                                          )}`}
                                </Text>
                            </Row>
                            <div style={leafStyles}>{renderWith}</div>
                        </Row>
                        {expandedPaths[path] && recursible ? (
                            <Node source={renderValue} parentPath={path} />
                        ) : null}
                    </div>
                )
            })}
        </>
    )
    const initialTransform = transform
        ? transform({ key: "", value: source, path: "" })
        : undefined
    const initialValue =
        initialTransform && initialTransform.entry
            ? initialTransform.entry[1]
            : source
    return <Node source={initialValue} parentPath={""} />
}
