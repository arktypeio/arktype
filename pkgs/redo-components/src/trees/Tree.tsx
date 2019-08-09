import React, { FC } from "react"
import { TreeItem } from "../trees"
import { TreeView as MuiTreeView } from "@material-ui/lab"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import ExpandMoreIcon from "@material-ui/icons/ExpandMore"
import ChevronRightIcon from "@material-ui/icons/ChevronRight"
import { isRecursible, ItemOrList, Entry } from "redo-utils"
import { ModalText, ModalButton } from "../modals"
import { Row, Column } from "../layouts"

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
}

const TreeItems: FC<TreeItemsProps> = ({ entries }) => (
    <>
        {entries.map(([k, v]) => {
            const key = String(Math.random())
            if (isRecursible(v)) {
                return (
                    <Row width={20}>
                        <TreeItem nodeId={key} key={key} label={k}>
                            <TreeItems entries={Object.entries(v)} />
                        </TreeItem>
                        {/* TODO make ModalButton appear when toggled. Requires making
                        real, ie non-random, keys. */}
                        <ModalButton>See card</ModalButton>
                    </Row>
                )
            } else {
                return (
                    <TreeItem nodeId={key} key={key} label={k}>
                        {<ModalText>{String(v)}</ModalText>}
                    </TreeItem>
                )
            }
        })}
    </>
)
