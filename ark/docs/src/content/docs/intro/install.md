---
title: Getting Started
---

## Installation

```bash
# (or whatever package manager you prefer)
npm install arktype
```

Our types are tested in [strict-mode](https://www.typescriptlang.org/tsconfig#strict) with TypeScript version `5.1+`.

If your types work but you notice errors in node_modules, this could be due to `tsconfig` incompatibilities- please enable `compilerOptions/skipLibCheck` ([docs](https://www.typescriptlang.org/tsconfig/#skipLibCheck)).
