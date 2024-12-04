import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import BackButton3D from "../islands/BackButton3D.tsx";

export default function Error404(props: PageProps) {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div class="px-4 py-8 mx-auto bg-[#86efac]">
        <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
          <img
            class="my-6"
            src="/logo.svg"
            width="128"
            height="128"
            alt="the Fresh logo: a sliced lemon dripping with juice"
          />
          <h1 class="text-4xl font-bold">404 - {props.route?.split("/")[1] === "blog" ? "Post" : "Page"} not found</h1>
          <p class="my-4">
            The page you were looking for doesn't exist.
          </p>
          <BackButton3D />
        </div>
      </div>
    </>
  );
}
