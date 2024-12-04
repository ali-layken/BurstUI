## Exploring Fresh

### Islands
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh is an amazing tool that lets you easily build websites; like the one you're on now! Fresh [focuses on Islands](https://deno.com/blog/intro-to-islands), which make it easy to specify what should be processed on the Server versus the Client. I want to write blog posts, like the one you are reading now, in simple Markdown. However, I also want to send you non-text content. To do this, I will have to partially convert the Markdown over here, and have you fill out the rest over there, on an :beach_umbrella: **Island**:

{{SpinningCube}}

Over here on the Server, I'll just focus on getting the static content [ :page_facing_up: ] ready and delivered while your browser does the dynamic content [ :red_square: ]. This dramatically affects how fast each page loads since I only have to compute the text to send you including the code [ :page_facing_up: ] for the cube [ :red_square: ]. I wont have to run any code related to generating the cube before responding to your browser navigating here. Your browser will immediately display the static text, and after that, start running the code to display the above SpinningCube as soon as it can.

### Dynamic Routing
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, I want to set up a blog system where I can easily make new posts. For now I have just made a single file in `posts` called `Blog_Setup.md`:

![Fresh Project: Directory Tree](/blogtree.png)

Using [dynamic routing](https://fresh.deno.dev/docs/getting-started/dynamic-routes), `/blog/[postname].tsx` will serve `[postname].md` as HTML when you visit its corresponding `/blog/[postname]`. I just have to add another Markdown file in the `posts` folder and another item to show up on the [homepage](/) and a new route to be generated. Going to [a post I haven’t made yet](/blog/fakepost) would fail since its corresponding `.md` file won't be found.

### Combination - Islands in Blog Posts 
![Code Responsible For Building Blog Post Pages: <code>/blog/[postname].tsx</code>](/[postname].png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above, `BlogRendererSS`, is a Markdown-to-HTML renderer that will run on the Server when you request a blog post turning `[postname].md` into HTML. `DynamicMarkdownItem` is an Island which replaces **`{{ SpinningCube }}`** in `Blog_Setup.md` with the corresponding Island. This replacement code it will run in your browser; the Client, and the static HTML will be replaced by the actual HTML and JavaScript code that displays the cube. This completes our goal of having a simple-but-dynamic blogging system that effectively separates Server and Client work.

![**SpinningCube** Island in Markdown](/ComponentsInMarkdown.png)

### Slide Back to the Home Page 
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Deno is a growing and promising land, especially as projects like Fresh evolve. I used [Deno Deploy](https://deno.com/deploy) to easily host this website, which is really just [a public GitHub repo](https://github.com/ali-layken/BurstUI/blob/main/posts/Blog_Setup.md), so you can really see how these renderers work if you like. Whenever theres a new commit on the repo [GitHub automatically builds the website](https://github.com/ali-layken/BurstUI/actions) and deploys it. When I say "over here", or refer to the Server, I am talking about [the computer running Deno/Fresh](https://deno.com/blog/anatomy-isolate-cloud) that received this build, that you connect to when visiting burst.deno.dev. Since I tried Deno last, about 2 years ago, it has greatly improved its integration with existing npm packages. I had **0 package issues** setting up this site. <br/><br/>
Using Islands really helps build a smooth experience by separating computing resources for specific tasks. Deciding what to handle locally and what to send can vary a ton depending on the goal. For example, for security, if I wanted to use an API key :key: to access Google Maps to show a Google Map in a blog post; I could make sure that API connection happens on the Server :closed_lock_with_key:, and not on an Island on the Client :unlock:. The homepage will load faster if you got the cube here or this page will load faster if you got the cube there since it is now your cube now! You are now in charge of the Cube Island I’ve sent. The :arrow_left: island below has a smooth opacity transition on it because **you** are rendering it. Try it out, I am not sending you video frames or animation updates, just the code for you to make your own frames and animations :space_invader:
