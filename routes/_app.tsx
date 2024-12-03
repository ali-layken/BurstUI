import { type PageProps } from "$fresh/server.ts";

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
          <div class="h-8 bg-bgPurple"></div>
          
          {/* Aqua middle div */}
          <div class="max-w-screen-md w-full sm:w-11/12 md:w-10/12 lg:w-8/12 xl:w-6/12 px-4 py-8 bg-bgAqua rounded-md shadow-lg">
            <Component />
          </div>
          
          {/* Add space below */}
          <div class="h-8 bg-bgPurple"></div>
        </div>
      </body>
    </html>
  );
}
