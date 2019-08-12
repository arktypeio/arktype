import React, { FC, useState } from "react"
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
import { DisplayAs } from "../displayAs"

const stylize = makeStyles({
    treeItem: {
        backgroundColor: "white",
        "&:hover": { backgroundColor: "#CDCDCD" },
        paddingLeft: "10px",
        paddingRight: "10px",
        paddingBottom: 0,
        paddingTop: 0
    },
    leafItem: {
        paddingLeft: "10px",
        paddingRight: "10px",
        paddingBottom: 0,
        paddingTop: 0
    }
})

type TreeSource = ItemOrList<Record<string, any>>

export type TreeProps<O extends TreeSource> = MuiTreeViewProps &
    (O extends any[]
        ? {
              from: O
              displayAs: Record<string, DisplayAs>
              labelKey: O extends any[] ? keyof O[number] : never
          }
        : {
              from: O
              labelKey?: never
              displayAs: Record<string, DisplayAs>
          })

export const Tree = <O extends TreeSource>({
    from,
    labelKey,
    displayAs,
    ...rest
}: TreeProps<O>) => {
    const entries: Entry[] = Array.isArray(from)
        ? from.map(({ [labelKey!]: key, ...rest }) => [key, rest])
        : Object.entries(from)
    return <TreeItems entries={entries} displayAs={displayAs} />
}

type TreeItemsProps = {
    entries: Entry[]
    path?: string[]
    indent?: number
    displayAs: Record<string, DisplayAs>
}

const TreeItems: FC<TreeItemsProps> = ({
    entries,
    path = [],
    indent = 0,
    displayAs
}) => {
    const [show, toggleShow] = useState(false)
    const { treeItem, leafItem } = stylize()
    return (
        <>
            {entries.map(([k, v]) => {
                return isRecursible(v) ? (
                    <Column style={{ marginLeft: indent * 5 }}>
                        <Row>
                            <Text
                                display="block"
                                classes={{ root: treeItem }}
                                onClick={() => toggleShow(!show)}
                            >
                                {String(k)}
                            </Text>
                            {displayAs[k] ? (
                                <ModalButton displayAs={displayAs[k]} />
                            ) : null}
                        </Row>
                        {show ? (
                            <TreeItems
                                path={[...path, String(k)]}
                                indent={(indent += 1)}
                                entries={Object.entries(v)}
                                displayAs={displayAs}
                            />
                        ) : null}
                    </Column>
                ) : (
                    <Column style={{ marginLeft: indent * 5 }}>
                        <Text classes={{ root: leafItem }}>{`${String(
                            k
                        )}: ${String(v)}`}</Text>
                    </Column>
                )
            })}
        </>
    )
}
