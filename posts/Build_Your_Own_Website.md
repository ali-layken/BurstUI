## Exploring Existing Websites

### 2 Kinds of Software: [Servers & Clients](https://youtu.be/lVhJ_A8XUgc?si=9zisuNGSqZ51tvLY)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;All websites and website technologies, of every language and scale, *boil down* :stew: to 3 main ingredients. These ingredients are just different kinds of :page_facing_up:**text we store in files**:
1. **JavaScript**: Code that the browsers can run. Chrome runs JavaScript files using Google’s open-source [V8 JavaScript Engine](https://github.com/v8/v8). To execute a `.js` file from your command line, you’ll need a runtime--software that reads and runs code. The most popular JavaScript runtime, [Node.js](https://nodejs.org/en), and what we will use today, Deno, are also built on the V8 engine. After installing, to run the code written in `server.js` for example, all you would have to do is `$ deno server.js`, similar to how Python code is run. 

1. **HTML**: This language describes to browsers what to draw in the window canvas. It contains the content and the ordering of paragraphs of *text*, *images*, *links*, *boxes*, and all the visual elements in the browser window. The JavaScript code can also read and change the window’s HTML: this is how most meaningful visual content changes and code interactions happen.

1. **CSS**: This is a set of properties you can use to modify the display of HTML elements. To match my HTML examples above, you could set *text* font, *images* opacity, *links* color, and *boxes* size. The same HTML can look significantly different depending on the `.css` style file sent with it. If you didn’t adequately receive the `.css` file when visiting a site, all the text could be black on the left, and the background would be white, depending on the browser’s CSS defaults. You may have briefly witnessed this as a slow site loads or if your connection was interrupted before getting the CSS.

The *boiling down* gets complicated as the three ingredients start to mix. Browsers are large softwares; web technologies, and as you’ll see, are up to so much of this *boiling* automatically under the hood. Let’s start with a minimal example. I’ll assume you're using a browser so lets type [`example.com`](https://example.com/) into the address bar:

![Press F12 to open Browser Tools -> `Network` tab](/1/example.png)

After I hit `↵ Enter`, my browser requests the `/` HTML file to display in its main window and `favicon.ico` to fill in the icon in the tab title bar. In the image above, my browser’s favicon request [404s](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404) (~~file~~ not found), but the `/` response is a document of type HTML. `example.com` is a minimal example, so it doesn’t have a favicon; without it, the main page will still load fine and we will see why next section...

### A New Dish
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, let’s explore how intense relationships :twisted_rightwards_arrows: between website technologies and the three main ingredients can get. Our minimal `example.com`, has sent 1 HTML file:

![Open a new tab and paste this into your address bar: `view-source:https://example.com/`](/1/exsource.png)

On **line 4**, we have an HTML `<title>` tag which modern browsers read and then render as the tab name:
![`example.com` Tab Name with no favicon](/1/exampleTab.png)

On **line 9**, there is an HTML `<style>` tag of type `text/css`, meaning the next block should be read as an inline `.css` file. On **line 14**, the inline CSS sets which font the browser should use to display text in the `<body>` tag:
![`example.com` Styled Content](/1/exampleFont.png)

Using the browser Developer Tools, I can delete some of what they sent to show you what a world with no CSS could look like:
![`example.com` No CSS Alternate Universe](/1/exampleFontHacked.png)

We are witnessing our first most basic twist :twisted_rightwards_arrows: on the ingredients: The :page_facing_up:**text stored in the file** is now of 2 languages that work according to 2 different standards stored in different ways on 2 computers. I don’t suppose you’ll find `example.com`’s `index.html` in your Downloads folder, and for all we know, `example.com`’s server software could be a mouse trained to jump on a keyboard to compose HTML and CSS and pack it up as an HTTP response. Most websites don’t employ mice and instead use software to listen for requests and craft & deliver responses. In the following sections we will see how to use Deno and Fresh as the software to generate the HTML files and send them along with JS code to run in the browser as a response. The best resources for learning how to use the three main ingredients and their standards are either [W3Schools](https://www.w3schools.com/) or, my preference, [Mozilla](https://developer.mozilla.org/en-US/docs/Web#web_technology_references). Mozilla also covers new :fire: web technologies like [WASM](https://developer.mozilla.org/en-US/docs/WebAssembly) and [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)


#### Wait, it’s all Computers & File Systems? :earth_africa::man_astronaut: :gun::woman_astronaut:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`example.com` is like a name for a computer that my browser can use to find and connect to over the internet. The software running on that computer, *serving* the file, is considered; *The Server*. Our greedy, needy browser software requesting so many files would be *The Client*. *Server* & *Client* are sometimes used to [refer to the machine](https://en.wikipedia.org/wiki/Server_(computing)#Operation), causing confusion with [server computers](https://en.wikipedia.org/wiki/PowerEdge), which are computers optimized to run server software. As we move into a computing landscape where most computers are running server and client software, [I suggest](https://www.ling.upenn.edu/courses/Fall_2003/ling001/language_change.html), when needed, we use **Host** when referring to computers running server software and **Guest** for computers running client software.
<br/><br/>
Most servers send `/index.html` by default when a file is not specified: `/`. You can see this is true by going to [`example.com/index.html`](https://example.com/index.html) or [`google.com/index.html`](https://google.com/index.html) and if you want to go on [a tangent](https://en.wikipedia.org/wiki/Robots.txt) try [`google.com/robots.txt`](https://google.com/robots.txt). The idea, traditionally, is that browsers [are like remote file system browsers](https://www.kernel.org/pub/), but the files we are sharing [have advanced](https://krunker.io/). If you [have Python installed](https://www.python.org/downloads/), you can easily see your own computer’s fs in your browser by trying:

```shellsession
$ python3 -m http.server # 8001 # <- uncomment if port in use
```

We’ll discuss computer names and securing ports in a future post, but for now, by visiting the link provided by Python in your browser, you’ll be able to navigate the folder in which you ran the command. This command started a program on your computer that is listening for HTTP requests on port 8000. This program would be considered a server, which isn’t surprising since we ran Python’s built-in http.server module using the `-m` option. This Python program just serves the files of the folder it was ran in and the HTML webpage just looks like a file browser. A port is like an extension to a computer name where that computer is listening for data that follows a specific protocol. HTTP and HTTPS are both different protocols to transfer website files, they define how the HTML and other files should be asked for and packed up. Most client softwares deliver HTTP requests to port 80 by default if no ports are specified in the request. Secure websites redirect HTTP requests to port 443, and secure browsers stick to HTTPS whenever possible effectively upgrading the security before receiving website content. 

![`example.com` HTTP (first 2 requests) vs HTTPS (second 2 requests)](/1/exampleSecure.png)

You can see this by visiting the insecure [`example.com:80/`](http://example.com:80/) or [`example.com:443/`](https://example.com:443/) and seeing that sending an HTTPS request to port 80 would fail since that port is expecting HTTP traffic: [`https://example.com:80`](https://example.com:80). Since that link cant be visited my browser, [Firefox by Mozilla](https://www.mozilla.org/en-US/firefox/), will never put it in the browser history, so the browser will never make the underline purple, which has been set in the CSS as the *visited* link color. Not all browsers *boil down* :curry: the same; on my phone the last *visited* link is the *hover* color until i tap something else, then the link loses focus and displays the *visited* color purple. The Mozilla reference tries its best to [keep track](https://developer.mozilla.org/en-US/docs/Web/CSS/:visited#browser_compatibility) of these browser differences.
## Website: **Publishing**
### Enter the Twisted World
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Server software and the hosts they run on are very diverse. Using JavaScript based server software provides a smooth experience because you can easily craft HTML, CSS, and JS in JavaScript as the language was built to do. However, there are [some definitive drawbacks](https://www.typescriptlang.org/why-create-typescript/) to writing code in JavaScript as it was originally intended to only ever run in the browser. I prefer using TypeScript which extends JavaScript to make it more like a traditional programming language and addresses these drawbacks. [Deno](https://deno.com/) is a growing and promising JavaScript, TypeScript, and WebAssembly runtime, meaning we can use it to run code we write in `.ts` files and have it *boil down* into JS code for clients. [Fresh](https://fresh.deno.dev/) is a set of server software and tools written in TypeScript that we will run using Deno. `burst.deno.dev` is the name of a computer on the internet that is using Deno to run TypeScript code that listens for website requests and dishes back responses. You can view the [public GitHub repo](https://github.com/ali-layken/BurstUI) where the code for this website is stored. Whenever it is updated, [GitHub runs a script](https://github.com/ali-layken/BurstUI/actions) that packs up all my files and sends them to [Deno Deploy](https://deno.com/deploy). Deno Deploy starts running the code on a computer named `burst.deno.dev`, and you can connect to it the same way you can connect to [`deno.dev`](https://deno.dev).
<br/><br/>
The documentation for Fresh is easy to navigate and short. I recommend [checking it out](https://fresh.deno.dev/docs/getting-started/create-a-project) as they explain each step in detail and offer alternative configurations. Here are the minimal steps to get a website up that others can visit, just like this one! (without the blog or cube:sob:)

#### Deno = [:goat:](https://www.merriam-webster.com/dictionary/GOATED) & Fresh = [:boat:](https://dictionary.reverso.net/english-definition/BOAT)
1. First, we have to install Deno. Follow [this link](https://docs.deno.com/runtime/getting_started/installation/) for OS-specific instructions. To check if it installed correctly, open a terminal and try:

```shellsession
$ deno -v
```

2. Next, we will use Deno to create a new Fresh Project. A Fresh Project consists of a bunch of TypeScript, most of which is code that listens for and responds to requests, provided by Fresh. The rest is the code that crafts each page of the website. Fresh gives you some sample pages but you'll want to replace these eventually with your own code. This command will download all the needed Fresh code and some put it in a folder you’ll have to name:
```shellsession
$ deno run -A -r https://fresh.deno.dev
```
3. Check out your minimal website by following the link Fresh gives you in the command line. You’ll receive your website from your own computer (:twisted_rightwards_arrows: host = guest)
```shellsession
$ cd whatever-you-named-it
$ deno task start
```
4. If you want others to be able to visit your website easily, you’ll first need a [GitHub account](https://github.com/), and then you’ll need to upload your code to Deno Deploy: (follow the link Deno gives you in the command line to see your site on the internet!)
```shellsession
$ deno install -gArf jsr:@deno/deployctl
$ deployctl deploy
```
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Step 4 is also technically optional since there are many [free hosting options](https://github.com/cloudcommunity/Cloud-Free-Tier-Comparison) available on the internet. This means there are many companies that will give you access to a computer that has a URL that can be found on the internet. This is nice because usually you have you have to pay to put your URL in a sort of public registry that maps names like `example.com` to actual computers. For example, you can ask the world to connect to your personal computer :face_with_peeking_eye: for all the files :smiling_imp::page_facing_up:. There are many ways to host files securely, and Deno Deploy [has its limitations](https://deno.com/blog/anatomy-isolate-cloud) as to what it can host, but it is a good introduction to cloud hosting and immediately offers a URL everyone can use easily. If you don’t want to send everyone the default Fresh lemon `index.html`, let’s check out how I used Fresh to send you this blog post:

## Website: **Building**
### Islands
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh focuses on [a feature called Islands](https://deno.com/blog/intro-to-islands), which makes it easy to specify what code should be run on the server versus the client. I want to write blog posts like the one you are reading now in [Markdown](https://commonmark.org/help/). Markdown is a simple language that simplifies text formatting, like wrapping words with \* for *italics*. This simplicity makes it the preferred language for text posts across the internet; [GitHub READMES](https://github.com/markedjs/marked), ChatGPT Conversations, and [Discord Messages](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline) all use Markdown. However, I also want to send you non-text content that Markdown cannot describe, like the cube below. For this to work smoothly, I’ll have to convert the Markdown into HTML partially over here and have you fill out the rest over there on an :beach_umbrella: **Island**:

{{SpinningCube}}

Over here on the server, I’ll focus on getting the static content:page_facing_up: (HTML + JS text) ready and delivered while your browser handles the dynamic content:red_square: (running JS). Limiting the server to simple text-processing tasks dramatically affects how fast each page loads since I only have to compute the text to send you before responding, including the code [ :page_facing_up: ] for the cube [ :red_square: ]. I won’t have to run any code to generate the cube before responding to your browser while navigating here. Your browser will immediately display the static text, and after that, start running the code to display the above SpinningCube as soon as it can.

### Dynamic Routing
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, I want to set up a blog system where I can easily make new posts. For now, I have just made a single file in `posts` called `Build_Your_Own_Website.md`:

![Fresh Project: Directory Tree](/1/blogtree.png)

Using [dynamic routing](https://fresh.deno.dev/docs/getting-started/dynamic-routes), `/blog/[postname].tsx` will serve `[postname].md` as HTML when you visit the corresponding `/blog/[postname]`, and if I add another Markdown file in the `posts` folder for a new link to show up on the [homepage](/) & a new route eg. `/blog/post2` will be generated. Going to [a post I haven’t made yet](/blog/fakepost) would fail since its corresponding `.md` file wouldn’t be found by my server resulting in a 404.

### Combination - Islands in Blog Posts 
![Code Responsible For Building Blog Post Pages: <code>/blog/[postname].tsx</code>](/1/[postname].png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above, `BlogRendererSS` is a Markdown-to-HTML renderer that will run on the server when you request a blog post; turning `[postname].md` into HTML. `DynamicMarkdownItem` is an Island that replaces **`{{ SpinningCube }}`**’s HTML with the corresponding actual Island’s HTML. This replacement code will run in your browser. The static HTML I sent will come alive and move, having been replaced by the actual HTML and JavaScript code that displays the cube. This twist completes our goal of having a simple but dynamic blogging system that effectively separates Server and Client work. If you want to see exactly how everything is setup [`postname.tsx`](https://github.com/ali-layken/BurstUI/blob/main/routes/blog/%5Bpostname%5D.tsx),[`BlogRendererSS.tsx`](https://github.com/ali-layken/BurstUI/blob/main/components/BlogRendererSS.tsx), [`DynamicMarkdownItem.tsx`](https://github.com/ali-layken/BurstUI/blob/main/islands/DynamicMarkdownItem.tsx), and the rest of the files are all on [Github](https://github.com/ali-layken/BurstUI).

![<strong>SpinningCube</strong> Island in Markdown](/1/ComponentsInMarkdown.png)

Using Islands helps build a smooth experience by separating computing resources for specific tasks. For these code blocks above, you get to run the JavaScript code in your browser that copies the text from the website text I sent into your clipboard. I have nothing to do with it. I sent you the text and code that **I think** you should have. Deciding:thinking: what to handle locally and what to send can vary depending on the goal; for example, for security, if I [bought an API key](https://mapsplatform.google.com/pricing/) :key: to access Google Maps to show a [Street View](https://developers.google.com/maps/documentation/javascript/streetview?hl=en) in a blog post; I could make sure that API connection happens on the server:closed_lock_with_key: and not on an Island on the Client:unlock: otherwise anyone could steal the connection details and destroy my wallet with the wonders of elastic pricing. The homepage will load faster if you received the cube here, or this page will load faster if you got the cube there since it is your cube now! You are now in charge of the Cube Island I’ve sent. The :arrow_left: island below has a smooth opacity transition because **you** are rendering it. Try it out. I am not sending you video frames or animation updates, just the code so your computer uses its own GPU to produce its own frames and animations!!! :space_invader: