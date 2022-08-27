import React from "react"
import styles from "./LoadingAnimation.module.css"
const LoadingAnimation = () => (
    <div className={styles.rollerContainer}>
        <div className={styles.roller}>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    </div>
)
export const MemoizedLoadingAnimation = React.memo(LoadingAnimation)
