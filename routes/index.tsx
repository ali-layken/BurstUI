import { join } from "node:path";
import SpinningCube from "../islands/SpinningCube.tsx";

export default async function Home() {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: string[] = [];

  for await (const entry of Deno.readDir(postsDirectory)) {
    if (entry.isFile && entry.name.endsWith('md')) {
      posts.push(entry.name.slice(0, -3));
    }
  }
  return (
    <>
      <SpinningCube/>
      <ul>
        {posts.map((slug) => (
          <li key={slug} class="mb-4">
            <a href={`/blog/${slug}`}
               class="text-accYellow hover:text-accRed hover:underline text-xl transition-colors duration-200">
              {slug.replace(/_/g, " ").toUpperCase()}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
