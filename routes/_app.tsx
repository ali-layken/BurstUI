import { PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";
import ResizeDetector from "../islands/ResizeDetector.tsx";
import { Head } from "$fresh/runtime.ts";
import { EmptyNav, navDiv } from "../utils/signals.tsx";
import { cubeNav } from "./cube.tsx";


export default function App(
  { Component, destination, route }: PageProps,
): JSX.Element {
  if (destination === "notFound"){navDiv.value = EmptyNav}
  else if (route === "/cube"){navDiv.value = cubeNav}
  return (
    <html>
      <Head>
        <meta charset="utf-8" key="charset" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title key="title">Welcome to Burst!</title>

        <link rel="stylesheet" href="/styles.css" />

        <meta property="og:image" content="/logo.png"key="og:image" />
        <meta property="og:title" content="Welcome to Burst!" key="og:title" />
        <meta property="og:description" content="A Website About Computers" key="og:description" />
        <meta property="og:url" content={`https://burst.deno.dev/`} key="og:url" />
        <meta property="og:type" content="website" key="og:type" />

      </Head>
      <body f-client-nav>
      <ResizeDetector />
        <div class="layout">
          <div
            id="background-container"
            class="min-h-screen bg-bgPurple flex flex-col items-center"
          >
            <div 
              id="main-container"
              class="w-full min-w-0 md:flex gap-8 justify-start md:justify-center bg-bgAqua md:bg-bgPurple max-w-4xl md:max-w-full px-5 py-8 rounded-md shadow-lg md:shadow-none min-h-screen md:min-h-0">
                <div id="wide-nav-container" class="hidden md:flex flex-2 w-[31rem] px-4 py-5 bg-bgAqua rounded-md shadow-lg self-start sticky flex-col">{navDiv.value}</div>
                <div id="component-container" class="max-w-4xl px-2 md:px-8 py-0 md:py-8 bg-none md:bg-bgAqua rounded-md shadow-none md:shadow-lg static md:relative w-full">
                  <Component />
                </div>
            </div>
            <div id="wide-bottom-or-narrow-nav-container"></div>
          </div>
        </div>
      </body>
    </html>
  );
}
