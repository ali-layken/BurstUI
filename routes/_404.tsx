import { Head, Partial } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import { EmptyNav, navDiv } from "../utils/signals.tsx";

export default function Error404(props: PageProps) {
  navDiv.value = EmptyNav;
  return (
    <>
      <Partial name="main-component">
        <Head>
          <title key="title">404 - {props.route?.split("/")[1] === "blog" ? "Post" : "Page"} not found</title>
          <meta key= "description" name="description" content={`404 - ${props.route?.split("/")[1] === "blog" ? "Post" : "Page"} not found`} />
          <meta property="og:title" content={`404 - ${props.route?.split("/")[1] === "blog" ? "Post" : "Page"} not found`} key="og:title"/>
          <meta property="og:description" content="This page could not be found on Burst!" key="og:description"/>
        </Head>
        <div class="px-4 py-8 font-fixel mx-auto">
          <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center bg-accLitePurple rounded-lg shadow-xl">
            <img
              class="my-6"
              src="/ballin.gif"
              width="128"
              height="128"
              alt="the Burst logo: a ball rolling NorthEast"
            />
            <h1 class="text-4xl">
              <strong>404 - {props.route?.split("/")[1] === "blog" ? "Post" : "Page"}</strong>
              {" "}
              not found
            </h1>
            <p class="my-4">
              The {props.route?.split("/")[1] === "blog" ? "blog post" : "page"}
              {" "}
              you were looking for doesn't exist.
            </p>
          </div>
        </div>
      </Partial>
    </>
  );
}
