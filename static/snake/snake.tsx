import { Partial } from "$fresh/runtime.ts";
import BackButton3D from "../../islands/BackButton3D.tsx";

export default function snakeRoute() {
  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <BackButton3D />
        </div>
      </Partial>
      <Partial name="main-component">
        <div style={{ width: "100%", height: "100vh", backgroundColor: "black" }}>
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
