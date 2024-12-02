import { join } from "node:path";
import SpinningCube from "../islands/SpinningCube.tsx";

export default async function Home() {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: { name: string; createdAt: Date }[] = [];

  for await (const entry of Deno.readDir(postsDirectory)) {
    if (entry.isFile && entry.name.endsWith('md')) {
      const filePath = join(postsDirectory, entry.name);
      const stat = await Deno.stat(filePath);
      posts.push({
        name: entry.name.slice(0, -3),
        createdAt: stat.birthtime ?? new Date(),
      });
    }
  }

  posts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <>
      <SpinningCube/>
      <ul>
        {posts.map((post, index) => (
          <li key={post.name} class="mb-4">
          <span class="text-xl font-bold text-accGreen mr-2">{index + 1}.</span>
          <a
            href={`/blog/${post.name}`}
            class="text-accYellow hover:text-accRed hover:underline text-xl transition-colors duration-200"
          >
            {post.name.replace(/_/g, " ").toUpperCase()}
          </a>
        </li>
        ))}
      </ul>
    </>
  );
}
