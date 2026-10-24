# arktype.io

The docs site: Next.js, statically exported to GitHub Pages.

```bash
pnpm dev # http://localhost:3000
pnpm build # static export to out/
```

- `content/docs` holds the pages as MDX. Each folder's `meta.json` orders its pages: `"---Label---"` starts a sidebar group, `"intro/setup"` lists a page in a subfolder, `"[text](/docs/x#y)"` adds a link, and pages that aren't listed are built but left out of the navigation, search and llms.txt. Folders with `"root": true` are sections.
- `lib/content` turns that into the site without Next: the page tree, frontmatter, heading ids, MDX compilation, highlighting with twoslash, search and redirects. Twoslash results are cached in `node_modules/.cache/ark-docs`.
- `lib/writeMarkdown.ts` writes each page as Markdown at its URL plus `.md`, and the llms.txt files, whenever `next.config.ts` loads.
- `components/mdx/components.tsx` lists every component a page can use.
