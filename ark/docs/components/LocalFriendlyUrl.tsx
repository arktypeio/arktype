"use client"
import { useEffect, useState } from "react"

export interface LocalFriendlyUrlProps {
	children: string
	url: string
	key?: string | number | undefined
}

export const LocalFriendlyUrl = (props: LocalFriendlyUrlProps) => {
	const [locallyAccessibleUrl, setLocallyAccessibleUrl] = useState(props.url)

	if (process.env.NODE_ENV === "development") {
		useEffect(() => {
			const devFriendlyUrl = new URL(props.url)
			devFriendlyUrl.protocol = "http:"
			devFriendlyUrl.host = window.location.host
			setLocallyAccessibleUrl(devFriendlyUrl.toString())
		}, [props.url])
	}

	return (
		<a href={locallyAccessibleUrl} key={props.key}>
			{props.children}
		</a>
	)
}
