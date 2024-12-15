## Existing Websites

### 2 Kinds of Software: [Servers & Clients](https://youtu.be/lVhJ_A8XUgc?si=9zisuNGSqZ51tvLY)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;All websites and website technologies, of every language and scale, *boil down* to 3 main ingredients. These 3 ingredients are just different kinds of **text we store in files**:
1. **JavaScript**; Code that the browsers can run. Chrome runs JavaScript files using Google's open-source [V8 JavaScript Engine](https://github.com/v8/v8). To execute a `.js` file from your command-line, you'll need a runtime--a software that reads code and runs it. The most popular JavaScript runtime [Node.js](https://nodejs.org/en), and what we will be using today, Deno, also are built on the V8 engine. After installing to run the code written in `server.js` all you would have to do is: `$ deno server.js`, similar to how Python is run. 

1. **HTML**; This is a language that describes to browsers what to draw in the window canvas. It contains the content and the ordering of paragraphs of *text*, *images*, *links*, *boxes*, and all the visual elements that you see in your browsers window. The JavaScript code can also read the window's HTML and change it: this is how most meaningful visual content changes and code interactions happen.

1. **CSS**; This is a set of properties you can use to modify the display of HTML elements. To match my HTML example, you could set *text* font, *images* opacity, *links* color, and *boxes* size. The same HTML can look extremely different depending on the `.css` style file that is sent with it. If you didn't properly receive the `.css` file when visiting a site, all the text could be black on the left and the background would be white, depending on the browsers CSS defaults. You may have briefly witnessed this as a slow site loads or if your connection is interrupted before getting the CSS.

The *boiling down* is where it gets complicated, as the 3 ingredients start to mix together. Let's start with a minimal example by typing [example.com](https://example.com/) into the browsers address bar:

![Press F12 to open Browser Tools](/1/example.png)

After I hit `↵ Enter` my browser requests the `/` HTML file to display in its main window and `favicon.ico` to fill in the icon in the tab title bar. `example.com` is very simple so it doesn't have a favicon. In the image above, my browser's favicon request [404s](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404) (~~file~~ not found) but the `/` request is responded to with a document of type HTML. `example.com` is like a name for a computer that my browser can use to find and connect to over the internet. The software running on that computer, *serving* the file, is considered to be; *The Server*. Our greedy needy browser software requesting so many files would be; *The Client*. *Server* & *Client* are used sometimes to refer to the machine but [this is dumb](https://en.wikipedia.org/wiki/Server_(computing)#Operation). The confusion comes from [server computers](https://en.wikipedia.org/wiki/PowerEdge) which are computers optimized to run server software. As we move into a computing landscape where most computers are running server and client software, [I suggest](https://www.ling.upenn.edu/courses/Fall_2003/ling001/language_change.html), when needed, we use **Host** when referring to computers running server software and **Edge** for computers running client software. Most servers send `/index.html` by default when a file is not specified: `/`. You can see this is true by going to [example.com/index.html](https://example.com/index.html) or [google.com/index.html](https://google.com/index.html) and if you want to go on [a tangent](https://en.wikipedia.org/wiki/Robots.txt) try [google.com/robots.txt](https://google.com/robots.txt). The idea, traditionally, is that browsers [are like remote file system browsers](https://www.kernel.org/pub/), but the files we are sharing [have really advanced](https://krunker.io/). If you [have Python installed](https://www.python.org/downloads/), you can easily see your own computer's fs in your browser by trying:

```shellsession
$ python3 -m http.server # 8001 # <- uncomment if port in use
```

We'll discuss computer names and securing ports in a future post..., but for now, by visiting the link provided by Python in the cli, you'll be able to navigate the folder you ran this command in.

### A new dish
Next, let's try to explore how intense relationships between website technologies and the 3 main ingredients can get. Coming back to our minimal `example.com`, all we have now is 1 HTML file:

![Open a new tab and paste this into your address bar: `view-source:https://example.com/`](/1/exsource.png)

On **line 4** we have a HTML `<title>` tag which modern browsers read and then render as the tab name:
![`example.com` Tab Name with no favicon](/1/exampleTab.png)

On **line 9** there is an HTML `style` tag of type `text/css` meaning it the next block should be treated like an inline `.css` file. On **line 14** the inline CSS sets which font should be used:
![`example.com` Styled Content](/1/exampleFont.png)

Using my browsers Developer Tools I can delete some of what they sent to show you what a world with no CSS could look like:
![`example.com` No CSS Alternate Universe](/1/exampleFontHacked.png)

#### Text Stored in Files...
We are witnessing our second most basic twist on the ingredients: The **text stored in the file** is now of 2 languages that work according to 2 different standards that has been stored in different ways on 2 computers. I don't suppose you'll find `example.com's index.html` in your Downloads folder and for all we know `example.com`'s server software could be a mouse trained to jump on a keyboard to write each HTML response back personally. Most websites don't employ mice and instead use the next twist we will explore; using Node, Python or any software to generate the HTML files and send them along with JS code to run in the browser as a response. The best resources for learning how to use the 3 main ingredients and their standards are either [W3Schools](https://www.w3schools.com/) or, my preference, [Mozilla](https://developer.mozilla.org/en-US/docs/Web#web_technology_references). Mozilla also covers new :fire:fye web technologies like [WASM](https://developer.mozilla.org/en-US/docs/WebAssembly) and [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

## Website: **Publishing**
### Enter the Twisted World
As I alluded to server software is very diverse. Node and Deno are very smooth server softwares because you can easily craft HTML CSS and JS responses in JavaScript as JavaScript was built to do. However, there are [some definitive drawbacks](https://www.typescriptlang.org/why-create-typescript/) to writing code in JavaScript, so I personally prefer using TypeScript. [Deno](https://deno.com/) is a growing and promising JavaScript, TypeScript, WebAssembly runtime, meaning we can use it to run code we write in `.ts` files. [Fresh](https://fresh.deno.dev/) is set of server software and tools that runs on Deno. `burst.deno.dev` is the name for a computer that is running Deno that is using Fresh to easily dish back responses. The code for this website is publicly available on my GitHub. Whenever new code is uploaded, GitHub starts running a script that packs up all my files and sends them to [Deno Deploy](https://deno.com/deploy). Deno Deploy starts running the code on a computer named `burst.deno.dev` and you can connect to it the same way you can connect to `[deno.dev](https://deno.dev)`.
<br/><br/>
The documentation for Fresh is easy to navigate and short. I recommend [checking it out](https://fresh.deno.dev/docs/getting-started/create-a-project) as they explain each step in detail and offer alternative configurations. For now here are the minimal steps to get a website up that others can visit just like this one! (without the blog or cube :sob:)

#### DENO = [:goat:](https://www.merriam-webster.com/dictionary/GOATED) & Fresh = [:boat:](https://dictionary.reverso.net/english-definition/BOAT)
1. First we have to install Deno. Follow [this link](https://docs.deno.com/runtime/getting_started/installation/) for OS specific instructions. Check if it was installed correctly; open a terminal and try:

```shellsession
$ deno -v
```

2. Next we will use deno to install Fresh and create a new Fresh Project (a new server):
```shellsession
deno run -A -r https://fresh.deno.dev
```
3. (optional) Check out your minimal website: (and then follow the link Fresh gives you in the cli)
```
cd [whatever-you-named-it]
deno task start
```
4. (optional) If you want others to be able to visit your website but not your computer you'll first need a [GitHub account](https://github.com/), and then you'll need to to upload your code to Deno Deploy:
```shellsession
deno install -gArf jsr:@deno/deployctl
deployctl deploy
```
Step 4 is optional, instead you can ask everyone in the world to connect to your personal computer :face_with_peeking_eye: for all the files :smiling_imp::page_facing_up:. There are many ways to securely host files, and Deno Deploy [has its limitations](https://deno.com/blog/anatomy-isolate-cloud) as to what it can host, but is a good introduction to cloud hosting and immediately offers a URL everyone can use easily. If you don't want to send everyone the default Fresh lemon `index.html` lets check out how I used fresh to send you this blog post:

## Website: **Building**
### Islands
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh focuses on [a feature called Islands](https://deno.com/blog/intro-to-islands), which make it easy to specify what code should be run on the Server versus the Client. I want to write blog posts, like the one you are reading now, in [Markdown](https://commonmark.org/help/).<br/><br/>
Markdown is a simple language which makes common text formatting really simple like wrapping words with \*\* for **bold**. This makes it the preferred language for text posts across the internet; [GitHub READMES](https://github.com/markedjs/marked), ChatGPT Conversations, and [Discord Messages](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline) all use Markdown. However, I also want to send you non-text content that Markdown is not capable of describing, like the cube below. For this to work smoothly I'll have to convert the Markdown into HTML partially over here, and have you fill out the rest over there, on an :beach_umbrella: **Island**:

{{SpinningCube}}

Over here on the Server, I'll just focus on getting the static content [ :page_facing_up: ] ready and delivered while your browser does the dynamic content [ :red_square: ]. This dramatically affects how fast each page loads since I only have to compute the text to send you before responding, including the code [ :page_facing_up: ] for the cube [ :red_square: ]. I won't have to run any code for generating the cube before responding to your browser navigating here. Your browser will immediately display the static text, and after that, start running the code to display the above SpinningCube as soon as it can.

### Dynamic Routing
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, I want to set up a blog system where I can easily make new posts. For now, I have just made a single file in `posts` called `Blog_Setup.md`:

![Fresh Project: Directory Tree](/1/blogtree.png)

Using [dynamic routing](https://fresh.deno.dev/docs/getting-started/dynamic-routes), `/blog/[postname].tsx` will serve `[postname].md` as HTML when you visit the corresponding `/blog/[postname]`. I just have to add another Markdown file in the `posts` folder for a new link to show up on the [homepage](/) & a new route to be generated. Going to [a post I haven’t made yet](/blog/fakepost) would fail since its corresponding `.md` file would'nt be found.

### Combination - Islands in Blog Posts 
![Code Responsible For Building Blog Post Pages: <code>/blog/[postname].tsx</code>](/1/[postname].png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above, `BlogRendererSS`, is a Markdown-to-HTML renderer that will run on the Server when you request a blog post; turning `[postname].md` into HTML. `DynamicMarkdownItem` is an Island that replaces **`{{ SpinningCube }}`**'s HTML with the corresponding actual Island's HTML. This replacement code will run in your browser; the Client. The static HTML I sent will come alive and start moving, having been replaced by the actual HTML and JavaScript code that displays the cube. This completes our goal of having a simple but dynamic blogging system that effectively separates Server and Client work.

![<strong>SpinningCube</strong> Island in Markdown](/1/ComponentsInMarkdown.png)

Using Islands helps build a smooth experience by separating computing resources for specific tasks, like for these code blocks, you get to run the code, in your browser, that copies the text from the website into your clipboard, I have nothing to do with it. I sent you the texts I think you should have. Deciding what to handle locally and what to send can vary depending on the goal; for example, for security, if I [bought an API key](https://mapsplatform.google.com/pricing/) :key: to access Google Maps to show a [Street View](https://developers.google.com/maps/documentation/javascript/streetview?hl=en) in a blog post; I could make sure that API connection happens on the Server :closed_lock_with_key:, and not on an Island on the Client :unlock: otherwise you could steal the connection details destroy my wallet with the wonders of elastic pricing. The homepage will load faster if you got the cube here or this page will load faster if you got the cube there since it is your cube now! You are now in charge of the Cube Island I’ve sent. The :arrow_left: island below has a smooth opacity transition because **you** are rendering it. Try it out, I am not sending you video frames or animation updates, just the code for you to make your own frames and animations!!! :space_invader: