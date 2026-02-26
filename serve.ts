import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

Deno.serve((req: Request) => {
  return serveDir(req, {
    fsRoot: ".",
    showIndex: true,
  });
});
