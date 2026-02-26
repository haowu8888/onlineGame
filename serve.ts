import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { fromFileUrl } from "https://deno.land/std@0.224.0/path/mod.ts";

const FS_ROOT = fromFileUrl(new URL(".", import.meta.url));

Deno.serve((req: Request) => {
  // 部署环境（如 Deno Deploy）访问 `/` 时通常希望返回 `index.html`。
  // 某些配置在 `showIndex: false` 下会对目录请求直接返回 404，导致首页 “Not Found”。
  // 这里显式把根路径映射到 `index.html`，并保留 index 文件的正常解析。
  const url = new URL(req.url);
  if (url.pathname === "/") {
    url.pathname = "/index.html";
    req = new Request(url.toString(), req);
  }

  return serveDir(req, {
    fsRoot: FS_ROOT,
    showIndex: true,
  });
});
