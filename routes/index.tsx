import { Head, Partial } from "$fresh/runtime.ts";
import { defineRoute } from "$fresh/server.ts";
import { join } from "node:path";
import AnimatedText3D from "../islands/AnimatedText3D.tsx";


export interface IndexLink {
  name: string;
  modifiedAt: Date;
}

export const homeRoute = async () => {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: IndexLink[] = [];

  for await (const entry of Deno.readDir(postsDirectory)) {
    if (
      entry.isFile && entry.name.endsWith("md") && !entry.name.startsWith("_")
    ) {
      const filePath = join(postsDirectory, entry.name);
      const stat = await Deno.stat(filePath);
      posts.push({
        name: entry.name.slice(0, -3),
        modifiedAt: stat.mtime ?? new Date(),
      });
    }
  }

  posts.sort((a, b) => a.modifiedAt.getTime() - b.modifiedAt.getTime());

  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <ul class="space-y-4">
            {posts.map((post, index) => {
              const isEven = index % 2 === 0;
              return (
                <li
                  key={post.name}
                  class="flex justify-between items-center w-full"
                >
                  {/* Left Section: Post Number and Name */}
                  <div class="flex items-center space-x-2">
                    <span
                      class={`text-3xl font-fixel ${
                        isEven ? "text-subtitles" : "text-accYellow"
                      }`}
                    >
                      <strong>{index + 1}.</strong>
                    </span>
                    <a
                      href={`/blog/${post.name}`}
                      f-partial={`/partials/blog/${post.name}`}
                      class="text-accGreen hover:text-accRed hover:underline text-xl font-source4 transition-colors duration-200"
                      data-action="close"
                    >
                      {post.name.replace(/_/g, " ")}
                    </a>
                  </div>

                  {/* Right Section: Timestamp */}
                  <time
                    class={`text-lg font-fixel ${
                      isEven ? "text-subtitles" : "text-accYellow"
                    }`}
                  >
                    {new Date(post.modifiedAt).toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ul>
        </div>
      </Partial>
      <Partial name="main-component">
        <Head>
          <title>Home</title>
        </Head>
        <AnimatedText3D
          text="Burst."
        />
        <p class="text-accLiteGreen text-2xl text-center font-fixel">
          <strong>Welcome</strong>, my <em>digitally wandering</em>{" "}
          visitor! This space is dedicated to turning my nonsensical &
          spontaneous adventures into something you can benefit from. If I ever
          do something cool, I truly want you to be able to do it too!
        </p>
      </Partial>
    </>
  );
};

export default defineRoute(homeRoute);
