---
"arktype": patch
---

temporarily disable numeric literal narrow validation in range and divisibility expressions

Unfortunately, our StackBlitz demos rely on an older version of TypeScript (<4.8) that does not support number literal narrowing. Hopefully we can migrate them to WebContainers or find another platform to host our demos and reenable this feature.
