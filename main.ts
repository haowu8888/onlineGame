// Deno Deploy / CLI 入口文件。
// 为了避免部署平台的 “entrypoint” 配置指向其它文件导致启动后返回 Not Found，
// 这里统一从 main.ts 启动，并复用 serve.ts 的静态站点服务逻辑。
import "./serve.ts";
