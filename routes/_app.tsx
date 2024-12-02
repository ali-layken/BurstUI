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
        <div class="min-h-screen bg-bgPurple flex items-center justify-center">
          <div class="max-w-screen-md w-full p-8 bg-bgAqua rounded-md shadow-lg">
            <Component />
          </div>
        </div> 
      </body>
    </html>
  );
}
