import { PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";
import ResizeDetector from "../islands/ResizeDetector.tsx";

export default function App(
  { Component, route }: PageProps,
): JSX.Element {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Burst!</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body f-client-nav>
        <div class="layout">
          <div
            id="background-container"
            class="min-h-screen bg-bgPurple flex flex-col items-center justify-start"
          >
            <div id="wide-top-container"></div>
            <div id="main-container">
              <div id="wide-nav-container"></div>
              <div id="component-container" class="invisible">
                  <Component />
              </div>
            </div>
            <div id="wide-bottom-or-narrow-nav-container"></div>
          </div>
          <ResizeDetector
            currentPage={route}
          />
        </div>
      </body>
    </html>
  );
}
