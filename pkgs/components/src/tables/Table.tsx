import React from "react"
import MaterialTable, { MaterialTableProps } from "material-table"
import { tableIcons } from "./Icons"

export type TableProps = MaterialTableProps<any> & {}

export const Table = ({ ...rest }: TableProps) => {
    return <MaterialTable icons={tableIcons} {...rest} />
}
