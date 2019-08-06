import React, { FC } from "react"
import { TreeView as MuiTreeView, TreeItem } from "@material-ui/lab"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import ExpandMoreIcon from "@material-ui/icons/ExpandMore"
import ChevronRightIcon from "@material-ui/icons/ChevronRight"
import { isRecursible } from "redo-utils"

export type TreeViewProps = MuiTreeViewProps & { from: object }

export const TreeView: FC<TreeViewProps> = ({ from, ...rest }) => {
    const generateTreeList = (from: object) =>
        Object.entries(from).map(([k, v]) => {
            if (isRecursible(v)) {
                return (
                    <TreeItem nodeId={k} label={k}>
                        {generateTreeList(v)}
                    </TreeItem>
                )
            } else {
                return (
                    <TreeItem nodeId={k} label={k}>
                        {<p>{String(v)}</p>}
                    </TreeItem>
                )
            }
        })

    const treeItems = generateTreeList(from)
    return (
        <MuiTreeView
            {...rest}
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
        >
            {treeItems}
        </MuiTreeView>
    )
}
