# All According to Plan...

<br />

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I was trying to learn some `c++` & `make` in my long journey that I have ahead of me, as I try to become more familiar with the computing world that we live in and where it came from.

 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[This branch](https://github.com/kr15h/ofxPiMapper/pull/191) I was making for this post crashes after 5 hours on my target machine (Acer Chromebook 14) so I waited all year to write a blog post. I wanted to start a cycle where I mess around with an interst, and that leads me to a project, and then after it is done I would take a break to reflect and float on to the next area the experince pushed me towards. However, this project didn't exactly go as planned, so my imagined routine was shattered and and this site fell silent.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;But hey. **It doesn't matter**. I felt like I had nothing to share because I only want to bring you the best experiences to learn from. This feeling pushed me away from writing but as I naturally came into contact with new ideas my mind started to float on again and I  eventually I did something that I really did want to share with any learners, a large checkpoint in the journey i mentioned earlier.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;But then I opened up this website and I saw this stub of a post. And I thought, hey I made some cool progress that I still want to show! I learned a lot especially that these things are hard and 100% solvalble but at **some** sort of cost. I could have spent a lot more time on solutions that woulden't have ever really worked, and as I learned never were meant to. 

 Why would we want XSource captures on a pi? Genereally, all I was doing was capturing browser screens but really even the shaders on shadertoy were just too much for my chromebook to be the one generating the images to be projected. The pi should really only be the projection mapper, the source of the streams should be remote. But then we would have to solve streaming. Ultimately, for an installation or something long lasting it doesnt make sense to project a live computed shader, rather even reccording the frames produced and saving them as a `.gif` is the actual original and intended way to use the specific projection mapping lib i picked up `ofxPiMapper`!

Really all I wrote was this 1 gstreamer pipeline, the rest was all pretty much made for me; I copied the new Source Template, made a new source called XSource and followed the directions and the ofx lib really just took care of running the pipeline for me:
```cpp
    std::string pipeline = "ximagesrc xid=" + std::to_string(targetWindow) + " use-damage=false ! "
                           "video/x-raw,format=BGRx,framerate=60/1 ! queue";
```
[In my branch](https://github.com/kr15h/ofxPiMapper/blob/35b7889e9cfef14918b9123a22e655dc673a791c/example_xwindow/src/XSource.cpp#L16)

<video controls preload="metadata" playsinline muted style="max-width: 100%; border-radius: 8px;"><source src="/3/show.mp4" type="video/mp4">Your browser does not support the video tag.</video>
<video controls preload="metadata" playsinline muted style="max-width: 100%; border-radius: 8px;"><source src="/3/angle.mp4" type="video/mp4">Your browser does not support the video tag.</video>

tags: Projection, Mapping, C++, pi, visual, effects