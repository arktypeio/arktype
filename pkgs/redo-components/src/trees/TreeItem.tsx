import React, { FC } from "react"
import { TreeItem as MuiTreeItem } from "@material-ui/lab"
import Dialog from "@material-ui/core"
import { TreeItemProps as MuiTreeItemProps } from "@material-ui/lab/TreeItem"
import { ModalView } from "../modals"

export type TreeItemProps = MuiTreeItemProps & {}

export const TreeItem: FC<TreeItemProps> = ({ children, ...rest }) => {
    return <MuiTreeItem {...rest}>{children}</MuiTreeItem>
}
