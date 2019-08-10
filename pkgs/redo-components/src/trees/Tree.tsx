import React, { FC } from "react"
import { TreeItem } from "../trees"
// if this hack works, need to make a new layout component and not use grid directly
import { Grid } from "@material-ui/core"
import { TreeView as MuiTreeView } from "@material-ui/lab"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import ExpandMoreIcon from "@material-ui/icons/ExpandMore"
import ChevronRightIcon from "@material-ui/icons/ChevronRight"
import { makeStyles } from "@material-ui/styles"
import { isRecursible, ItemOrList, Entry } from "redo-utils"
import { ModalText, ModalButton } from "../modals"
import { Row, Column } from "../layouts"
import { Text } from "../text"
import { Button } from "../buttons"

// const stylize = makeStyles({
//     content: { width: 0, alignItems: "flex-start" },
//     label: {},
//     iconContainer: { marginRight: 0, width: 0, justifyContent: "flex-start" },
//     root: {
//         width: 100
//     },
//     group: {
//         marginLeft: 20
//     }
// })

// const stylizeTree = makeStyles({
//     root: {
//         width: 10
//     }
// })

type TreeSource = ItemOrList<Record<string, any>>

export type TreeProps<O extends TreeSource> = MuiTreeViewProps &
    (O extends any[]
        ? {
              from: O
              labelKey: O extends any[] ? keyof O[number] : never
          }
        : {
              from: O
              labelKey?: never
          })

export const Tree = <O extends TreeSource>({
    from,
    labelKey,
    ...rest
}: TreeProps<O>) => {
    // const { root } = stylizeTree()
    const entries: Entry[] = Array.isArray(from)
        ? from.map(({ [labelKey!]: key, ...rest }) => [key, rest])
        : Object.entries(from)
    return (
        <MuiTreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            // classes={{ root: root }}
            {...rest}
        >
            <TreeItems entries={entries} />
        </MuiTreeView>
    )
}

type TreeItemsProps = {
    entries: Entry[]
    path?: string[]
}

const TreeItems: FC<TreeItemsProps> = ({ entries, path = [] }) => {
    // const { content, iconContainer, root, label, group } = stylize()
    return (
        <>
            {entries.map(([k, v]) => {
                const id = String(Math.random())
                if (isRecursible(v)) {
                    return (
                        <Row>
                            <TreeItem
                                // classes={{
                                //     content: content,
                                //     root: root,
                                //     label: label,
                                //     iconContainer: iconContainer,
                                //     group: group
                                // }}
                                nodeId={id}
                                key={id}
                                label={String(k)}
                                onClick={() => console.log(5)}
                            >
                                <TreeItems
                                    path={[...path, String(k)]}
                                    entries={Object.entries(v)}
                                />
                            </TreeItem>
                        </Row>
                    )
                } else {
                    return <Text>{`${String(k)}: ${String(v)}`}</Text>
                }
            })}
        </>
    )
}
