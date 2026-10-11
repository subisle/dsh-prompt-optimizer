# 本地类型检查垫片（非官方包副本）

`@deepseek-ai/dsh-client-ui-renderer` 未发布到 npm，而本插件的客户端代码需要它的
`Context` 类型合并才能独立通过 `tsc`。此目录仅提供最小 `.d.ts` 声明，
**不包含任何官方实现代码**，也不参与任何运行时产物（`files` 未包含 vendor/）。

真实运行时由 DSH 宿主提供 `ctx.slots` 服务；本目录仅用于 `npm run build` 的类型检查。
