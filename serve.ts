import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

Deno.serve((req: Request) => {
  return serveDir(req, {
    fsRoot: ".",
    // 开发期可改为 true；避免误部署时暴露目录索引
    showIndex: false,
  });
});
