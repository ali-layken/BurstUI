import { Partial } from "$fresh/runtime.ts";
import { Handlers } from "$fresh/server.ts";
import BackButton3D from "../islands/BackButton3D.tsx";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const resp = await ctx.render();
    resp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    resp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    return resp;
  },
};


export default function snakeRoute() {
  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <BackButton3D />
        </div>
      </Partial>
      <Partial name="main-component">
        <div style={{ width: "100%", height: "50vh", backgroundColor: "black" }}>
          {/* Embed the Godot game via iframe */}
          <iframe
            src="/snake/index.html"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="Godot Game"
          ></iframe>
        </div>
      </Partial>
    </>
  );
}
