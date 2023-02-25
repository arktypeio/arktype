export default `body {
    font-family: "Cascadia Code", sans-serif;
    background-color: hsl(220 18% 10%);
}

#demo {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: -8px;
    padding: 8px;
}

#input {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
}

.section {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 8px;
}

.card {
    padding: 8px;
    background-color: rgb(18, 18, 18);
    color: rgb(255, 255, 255);
    /* transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; */
    border-radius: 4px;
    box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 1px -1px,
        rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 1px 3px 0px;
    background-image: linear-gradient(
        rgba(255, 255, 255, 0.05),
        rgba(255, 255, 255, 0.05)
    );
    height: 100%;
}

p {
    white-space: pre-wrap;
}

pre {
    white-space: pre-wrap;
}

h3 {
    margin: 0px;
    color: #fffff0;
}

.key {
    color: #80cff8;
}
.val {
    color: #f5cf8f;
}
`
