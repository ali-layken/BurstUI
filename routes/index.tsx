import { Head, Partial } from "$fresh/runtime.ts";
import { join } from "node:path";
import AnimatedText3D from "../islands/AnimatedText3D.tsx";
import CopyableText from "../islands/CopyableText.tsx";

export interface IndexLink {
  name: string;
  subtitle?: string;
  route: string;
  modifiedAt?: Date;
}

export default async function homeRoute() {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: IndexLink[] = [];
  const demos: IndexLink[] = [];

  for await (const entry of Deno.readDir(postsDirectory)) {
    if (
      entry.isFile && entry.name.endsWith("md") && !entry.name.startsWith("_")
    ) {
      const filePath = join(postsDirectory, entry.name);
      const stat = await Deno.stat(filePath);
      const fullname = entry.name.slice(0, -3)
      posts.push({
        route: fullname,
        name: fullname.split(':')[0],
        subtitle: fullname.split(':')[1],
        modifiedAt: stat.mtime ?? new Date(),
      });
    }
  }

  demos.push({
    name: "Snake 2.5",
    route: "/snake",
  });

  posts.sort((a, b) => a.modifiedAt!.getTime() - b.modifiedAt!.getTime());
  
  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <h2 class="font-fixel ml-4 mb-2 text-accRed2 text-4xl font-semibold">
            Posts:
          </h2>
          <ul class="space-y-4">
            {posts.map((post, index) => {
              const isEven = index % 2 === 0;
              return (
                <li
                  key={post.name}
                  class="flex justify-between items-center w-full"
                >
                  {/* Left Section: Post Number and Name */}
                  <div class="flex items-center">
                    <span
                      class={`text-3xl font-fixel mr-1 text-right w-8 ${
                        isEven ? "text-subtitles" : "text-accYellow"
                      }`}
                    >
                      <strong>{index + 1}.</strong>
                    </span>
                    <a
                      href={`/blog/${post.route}`}
                      f-partial={`/partials/blog/${post.route}`}
                      class="text-accGreen hover:text-accRed hover:underline text-lg md:text-xl font-fixel transition-colors duration-200 ml-2"
                      data-action="close"
                    >
                      {post.name.replace(/_/g, " ")}:<br />
                      <p class="italic font-source4 ml-4" data-action="close">
                      {post.subtitle && post.subtitle?.replace(/_/g, " ")}
                      </p>
                    </a>
                  </div>

                  {/* Right Section: Timestamp */}
                  <time
                    class={`text-sm md:text-lg font-fixel ${
                      isEven ? "text-subtitles" : "text-accYellow"
                    }`}
                  >
                    {new Date(post.modifiedAt!).toLocaleDateString()}
                  </time>
                </li>
              );
            })}
          </ul>
          <hr class="mx-2 my-4" />
          <h2 class="font-fixel ml-4 mb-2 text-accRed2 text-4xl font-semibold">
            Demos:
          </h2>
          <ul class="space-y-4">
            {demos.map((post, index) => {
              const isEven = index % 2 === 0;
              return (
                <li
                  key={post.name}
                  class="flex justify-between items-center w-full"
                >
                  {/* Left Section: Post Number and Name */}
                  <div class="flex items-center">
                    <span
                      class={`text-3xl font-fixel mr-1 text-right w-8 ${
                        isEven ? "text-subtitles" : "text-accYellow"
                      }`}
                    >
                      <strong>{index + 1}.</strong>
                    </span>
                    <a
                      href={post.route!}
                      f-partial={`/partials${post.route!}`}
                      class="text-accGreen hover:text-accRed hover:underline text-xl md:text-2xl italic font-source4 transition-colors duration-200 ml-2"
                      data-action="close"
                    >
                      {post.name.replace(/_/g, " ")}<br />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Partial>
      <Partial name="main-component">
        <Head>
          <meta key= "description" name="description" content={"Home Page"} />
          <meta key="robots" name="robots" content="index" />

          <title key="title">Home</title>

          <link key="canonical" rel="canonical" href={`https://burst.deno.dev/`}></link>
          <meta property="article:tag" content="" key="og:tags" />
        </Head>
        <AnimatedText3D text="Burst." />
        <br />
        <p class="text-accLiteGreen text-3xl text-center font-fixel mt-1">
          <strong>Welcome</strong>, my <em>digitally wandering</em>{" "}
          visitor! This space is for sharing knowledge that I hope you can
          benefit from.
        </p>
        <div class="bottom-0 flex justify-center items-center w-full mt-12">
          <span class="flex items-center text-subtitles text-2xl font-fixel px-4">
            <img class="marked-emoji-img mr-1" alt="discord" src="/emojis/discord.svg" />
            <span class="mr-2 mt-0.7">Discord:</span>
            <CopyableText text="@supaboop" />
          </span>
          <span class="mx-4 text-accRed">|</span>
          <span class="flex items-center text-accRed2 text-2xl font-fixel px-4">
            <img class="marked-emoji-img mr-1" alt="github" src="/emojis/github.png" />
            <a class="text-accGreen hover:text-accRed hover:underline transition-colors duration-200" href="https://github.com/ali-layken" target="_blank" rel="noopener noreferrer">Github</a>
          </span>
        </div>
      </Partial>
    </>
  );
}
