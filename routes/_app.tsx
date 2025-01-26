import { PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";
import ResizeDetector from "../islands/ResizeDetector.tsx";
import { Head } from "$fresh/runtime.ts";


export default function App(
  { Component }: PageProps,
): JSX.Element {
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
        <meta name="google-site-verification" content="KRBcu1DopKhVwHP6lCOyY1OsKdZwiI7KGutSJTDOL4o" />

      </Head>
      <body f-client-nav>
      <ResizeDetector />
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
        </div>
      </body>
    </html>
  );
}
