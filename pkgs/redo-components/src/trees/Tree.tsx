import React, { FC, useState } from "react"
import { TreeViewProps as MuiTreeViewProps } from "@material-ui/lab/TreeView"
import { makeStyles } from "@material-ui/styles"
import { isRecursible, ItemOrList, Entry } from "redo-utils"
import { ModalButton } from "../modals"
import { Row, Column } from "../layouts"
import { Text } from "../text"
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
    displayAs
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
    const { treeItem, leafItem } = stylize()
    const TreeNode = ({ k, v }: any) => {
        const [show, toggleShow] = useState(false)
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
                        <ModalButton
                            open={false}
                            displayAs={displayAs[k]}
                            contents={v}
                        />
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
                <Text classes={{ root: leafItem }}>{`${String(k)}: ${String(
                    v
                )}`}</Text>
            </Column>
        )
    }

    return (
        <>
            {entries.map(([k, v]) => {
                return <TreeNode k={k} v={v} />
            })}
        </>
    )
}
