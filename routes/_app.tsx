import { type PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Burst!</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        {/* Outer wrapper to maintain purple background */}
        <div class="min-h-screen bg-bgPurple flex flex-col items-center justify-center">
          {/* Add space above */}
          <div class="h-12 bg-bgPurple"></div>

          {/* Container with padding to ensure purple border */}
          <div class="max-w-4xl w-full px-4">
            {/* Aqua middle div */}
            <div class="w-full px-8 py-8 bg-bgAqua rounded-md shadow-lg">
              <Component />
            </div>
          </div>

          {/* Add space below */}
          <div class="h-12 bg-bgPurple"></div>
        </div>
      </body>
    </html>
  );
}
