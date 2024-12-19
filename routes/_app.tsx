import { type PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";
import DynamicLayout from "../islands/DynamicLayout.tsx";
import ResizeDetector from "../islands/ResizeDetector.tsx";
import { linklist } from "../utils/linklist.ts";

export default function App({ Component, route }: PageProps): JSX.Element {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Burst!</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <DynamicLayout currentPage={route} headingsSignal={linklist}>
          <Component />
        </DynamicLayout>
        <ResizeDetector />
      </body>
    </html>
  );
}
