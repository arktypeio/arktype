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

const stylize = makeStyles({
    content: {
        width: 10
    }
})
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
    const entries: Entry[] = Array.isArray(from)
        ? from.map(({ [labelKey!]: key, ...rest }) => [key, rest])
        : Object.entries(from)
    return (
        <MuiTreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
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
    const { content } = stylize()
    return (
        <>
            {entries.map(([k, v]) => {
                const id = String(Math.random())
                if (isRecursible(v)) {
                    return (
                        <Row>
                            <TreeItem
                                // classes={{ width: "10" }}
                                classes={{ content: content }}
                                nodeId={id}
                                key={id}
                                label=""
                            >
                                <TreeItems
                                    path={[...path, String(k)]}
                                    entries={Object.entries(v)}
                                />
                            </TreeItem>
                            <ModalText>{k}</ModalText>
                        </Row>
                    )
                } else {
                    return (
                        <Row>
                            <TreeItem nodeId={id} key={id} label="">
                                {<ModalText>{String(v)}</ModalText>}
                            </TreeItem>
                            <ModalText>{k}</ModalText>
                        </Row>
                    )
                }
            })}
        </>
    )
}
