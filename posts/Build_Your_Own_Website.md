## Exploring Fresh

### Islands
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh is an amazing tool that lets you build :ice_cube:cool websites; like the one you're on now! Fresh focuses on [a feature called Islands](https://deno.com/blog/intro-to-islands), which make it easy to specify what should be processed on the Server versus the Client. I want to write blog posts, like the one you are reading now, in [Markdown](https://commonmark.org/help/).<br/><br/>
Markdown is a simple language which makes common text formatting really simple like wrapping words with \*\* for **bold**. This makes it the preferred language for text posts across the internet; [GitHub READMES](https://github.com/markedjs/marked), ChatGPT Conversations, and [Discord Messages](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline) all use Markdown. However, I also want to send you non-text content that Markdown is not capable of displaying, like the cube below. For this to work smoothly I'll have to convert the Markdown partially over here, and have you fill out the rest over there, on an :beach_umbrella: **Island**:

{{SpinningCube}}

Over here on the Server, I'll just focus on getting the static content [ :page_facing_up: ] ready and delivered while your browser does the dynamic content [ :red_square: ]. This dramatically affects how fast each page loads since I only have to compute the text to send you including the code [ :page_facing_up: ] for the cube [ :red_square: ]. I won't have to run any code for generating the cube before responding to your browser navigating here. Your browser will immediately display the static text, and after that, start running the code to display the above SpinningCube as soon as it can.

### Dynamic Routing
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, I want to set up a blog system where I can easily make new posts. For now, I have just made a single file in `posts` called `Blog_Setup.md`:

![Fresh Project: Directory Tree](/1/blogtree.png)

Using [dynamic routing](https://fresh.deno.dev/docs/getting-started/dynamic-routes), `/blog/[postname].tsx` will serve `[postname].md` as HTML when you visit the corresponding `/blog/[postname]`. I just have to add another Markdown file in the `posts` folder for a new link to show up on the [homepage](/) & a new route to be generated. Going to [a post I haven’t made yet](/blog/fakepost) would fail since its corresponding `.md` file would'nt be found.

### Combination - Islands in Blog Posts 
![Code Responsible For Building Blog Post Pages: <code>/blog/[postname].tsx</code>](/1/[postname].png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above, `BlogRendererSS`, is a Markdown-to-HTML renderer that will run on the Server when you request a blog post; turning `[postname].md` into HTML. `DynamicMarkdownItem` is an Island that replaces **`{{ SpinningCube }}`** in the HTML with the corresponding Island's. This replacement code will run in your browser; the Client. The static HTML I sent will come alive and start moving, having been replaced by the actual HTML and JavaScript code that displays the cube. This completes our goal of having a simple but dynamic blogging system that effectively separates Server and Client work.

![<strong>SpinningCube</strong> Island in Markdown](/1/ComponentsInMarkdown.png)

```js
const supaheat = 33;
```

### DENO = [:goat:](https://www.merriam-webster.com/dictionary/GOATED) & Fresh = [:boat:](https://dictionary.reverso.net/english-definition/BOAT)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Deno is a growing and promising land, especially as projects like Fresh evolve. I used [Deno Deploy](https://deno.com/deploy) to host this website for free. The code is all in [a public GitHub repo](https://github.com/ali-layken/BurstUI/blob/main/posts/Blog_Setup.md), so you can see how these renderers work if you like. Whenever there's a new commit on the repo [GitHub automatically builds the website](https://github.com/ali-layken/BurstUI/actions) and deploys it. When I say "over here", or refer to the Server, I am talking about [the computer running Deno/Fresh](https://deno.com/blog/anatomy-isolate-cloud) that received this build, that you connect to when visiting burst.deno.dev in your browser. Since I tried Deno last, about 2 years ago, it has greatly improved its integration with existing npm packages. I had **0 package issues** setting up this site :relieved: & this is all it took to scaffold and deplo<br/><br/>
Using Islands helps build a smooth experience by separating computing resources for specific tasks. Deciding what to handle locally and what to send can vary depending on the goal. For example, for security, if I wanted to use an API key :key: to access Google Maps to show a Google Map in a blog post; I could make sure that API connection happens on the Server :closed_lock_with_key:, and not on an Island on the Client :unlock:. The homepage will load faster if you got the cube here or this page will load faster if you got the cube there since it is your cube now! You are now in charge of the Cube Island I’ve sent. The :arrow_left: island below has a smooth opacity transition because **you** are rendering it. Try it out, I am not sending you video frames or animation updates, just the code for you to make your own frames and animations!!! :space_invader: