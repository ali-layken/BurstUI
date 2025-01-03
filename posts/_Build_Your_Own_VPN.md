## How did we end up here?

### *Step 1:* Connecting to the Internet

#### A Fresh Linux Install

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I was trying to install :arch_linux:[Arch Linux](https://archlinux.org/) on an old Chromebook and y'all didn't lie, I don't even have a [window manager](https://en.wikipedia.org/wiki/Window_manager), yet and I've had to [pick a font](https://wiki.archlinux.org/title/Font_configuration), decide on a [network manager](https://wiki.archlinux.org/title/Network_configuration#Network_managers), and make many more decisions, all of which were tough without an internet connection. Arch is brutally customizable and I look forward to sharing my ArchBookOS setup in a future post...
<br/><br/>
What got me really distracted, and caused this write-up, was setting the DNS Server my :arch_linux:📖 should use. Now whats a DNS Server? and why would anyone need one? Well, without one, I simply wasn't able to update my OS or even go to `google.com`:

![No updates & No `google.com`](/2/nodns.png)

#### **What The Heck #1:** IP Address

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;How could this be? My laptop is connected to my home router from which it received an IP Address `10.0.0.95`. An [IP Address](https://en.wikipedia.org/wiki/IP_address) is just like [a real home Address](https://en.wikipedia.org/wiki/House_numbering): using this IP Address the router and other computers can send information just like sending mail :mailbox_with_mail: to a real address. Without an IP a computer wouldn't even be able to ask for data since the computer it asked wouldn't be sure where to send it back to. This means all requests need a *destination* and a *return address*. We can see that my IP was set properly by doing a little test connection from another computer connected to my router:

![Laptop is on [LAN](https://en.wikipedia.org/wiki/Local_area_network) :heavy_check_mark:](/2/lan.png)

The computers on my home network can find each other just fine, but for some reason, we aren't able to connect to `google.com`? This is because my router is actually a computer:computer: that is running server software that keeps track of all the addresses it has dished out as more computers and phones connect. [A section in my website post](http://bean.deno.dev/blog/Build_Your_Own_Website#wait-its-all-computers--file-systems-earthafricamanastronaut-gunwomanastronaut) covers what constitutes a server software and the communication patterns computers use, but for now lets just say that means my router is listening for computers sending data that would count as an IP Address request. I used [`iwd`](https://wiki.archlinux.org/title/Iwd#iwctl) to look for available Wi-fi networks and connect to my router. `iwd` worked with some lower level OS services like `networkd` and `resolvd` to first, ask my router for an IP address, and then make it available for applications like `pacman` & `ping` to use so they can send and receive data. HTTP is a protocol that servers (software) use to listen for and respond to website requests from browsers & other HTTP tools like Chrome, Firefox, and `ping` that send: HTTP requests. Similarly, [DHCP](https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-top) is a protocol server softwares use to listen for IP Address requests from clients, in this case, initiated by `iwd`, and keep track of the IP's properties like its expiry. Delivering [packets](https://en.wikipedia.org/wiki/Network_packet) to IP addresses that my router has dished out is trivial; it knows very well how to send data to an address it is maintaining, however, to find a [*hostname*](https://en.wikipedia.org/wiki/Hostname) like `google.com` will require a couple more steps. If the idea of computer communication is feeling unclear please :mag:check out the short and sweet post section I linked above and [here](http://bean.deno.dev/blog/Build_Your_Own_Website#wait-its-all-computers--file-systems-earthafricamanastronaut-gunwomanastronaut) for an interactive example.

### *Step 2:* Connecting to a DNS Server

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Given an IP Address, my router was able to properly... *route*, to the correct computer. If only I knew the address of the computer serving `google.com` or the update files; then I could just ask our router to go there. If I ask my router to go to an address that it isn't maintaining itself it hands the request up to Xfinity that eventually gets it to the right computer because thats what we pay ISPs to do. Luckily there are computers running another special server software following the [DNS](https://en.wikipedia.org/wiki/Domain_Name_System) protocol that we can use to request conversions from *hostnames* and IP Addresses. On my :arch_linux:📖 i can set the DNS server to be used by editing `/etc/resolv.conf` but across OSs, in Wi-fi Settings Tabs on phones and Control Panels on Desktops there usually exists the ability to manually set a DNS Server:

![*Wi-Fi* > *__i__ next to network name* > *Configure DNS*](/2/dnssettings.png)

Unlike my :arch_linux:📖 my iPad :apple_logo: runs [the superior linux](https://en.wikipedia.org/wiki/Darwin_(operating_system)) that always just works, because it "Automatically" used the DNS server that the DHCP response told the machine to use. `75.75.75.75` is the address of Xfinity's Public DNS Server because my router's software is controlled by Xfinity so I can't edit the DNS Server they set in the DHCP request. This means every time i request `google.com` my iPad asks Xfinity's computer for `google.com`'s address. The Server will lookup that hostname in a giant table or ask another DNS Server for help using its massive table. Knowing Xfinity, they will probably take some more steps to log that I looked up [Super Smash Bros. Combo Videos](https://www.youtube.com/watch?v=rD2Zqje5Wm0) on Youtube and then sell that information so that Amazon advertise Nintendo Switches to me. In the end you'll get back an IP Address that our computer can use to connect to the computer hosting the service we are trying to access.

At this point most :arch: guides recommend connecting to any random software company's :google_logo: computer. I am not exactly sure why, but I didn't want to do this. My first search for alternatives led me to discover [Pi-hole](https://pi-hole.net/) which gave me both a [reason](https://docs.pi-hole.net/guides/dns/unbound/) and a method. Pi-Hole is server software that can be configured to handle DNS and DHCP requests and in the rest of this post we will be using it to setup a DNS Server. This is perfect since I already have a [Raspberry Pi 4 B](https://www.raspberrypi.com/products/):computer: running [Raspbian](https://www.raspbian.org/) :r_pi: + :debian_logo: that is setup to run services in containers.

#### I thought we were making a VPN...

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I am not going to stop there, recently at my software job, I have had to research some new mobile:iphone: exploits, so I wanted to try securing my Google Pixel 6's network traffic while outside :earth_africa: my local network. To do this I'll also be setting up [Tailscale](https://tailscale.com/). Tailscale creates an encrypted [p2p connection](https://en.wikipedia.org/wiki/Peer-to-peer) directly from my phone and whatever network its on (5G, Wi-Fi, Hotspot) to the pi behind my router. This means that when I am outside my house, my phone will be able to connect to my pi through the shortest possible route and not even the owners of the network will be able to see the content of the packets I am sending since they are encrypted. Tailscale provides a static (unchanging) IP for each device you add and they support pretty much every OS where you can install a VPN. Previously, I was using this static IP to easily ssh into my pi from phone while outside, but in this post we will instead be focused on my pi's port 53 and configuring it to accept DNS requests. We will set the pi's static IP as the DNS on my phone but beyond that we will setup a Tailscale [exit-node](https://tailscale.com/kb/1103/exit-nodes) so that not only ssh and DNS, but all internet requests are first encrypted and go to my pi for decryption and then out my home router to the internet. This setup all together is effectively a Private VPN because this is all that normal VPNs like NordVPN do without the tracking or fee. There are a few features that commercial VPNs offerings that I can't setup... alone :busts_in_silhouette:; using Tailscale you can [privately share access](https://tailscale.com/kb/1084/sharing) to services and entire machines running on your tailnet meaning a group of international friends could setup a very efficient geographical VPN. For example, If I asked a friend in Canada, I could set my phone's exit-node to bro's pi and access TikTok [like nothing happened](https://en.wikipedia.org/wiki/Censorship_of_TikTok).

## Where do we go? (VPN Setup)

### *Step 1:* Containers

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I love [containers](https://en.wikipedia.org/wiki/LXC) for their security and diversity and portability. Containers [can get very complex](https://hub.docker.com/r/microsoft/windows) but the basic idea for us today is that they are like mini OS environments that run inside your OS. These environments can easily be customized and brought up & down with a script. Having a separate computing environments helps keep things simple and efficient. Lets say my pi is using Python `3.12` located at `/usr/bin/python`, I won't have to mess with this binary or path at all if pihole asks for say Python `3.10`. Instead, the alternate Python version will just be installed inside the container and found when pihole tries to run `$ python`. Lets say tomorrow after running pihole I wake up and decide I want to maintain a Mailing List. Well then I would pretty much have to run [mailman2](https://github.com/Koumbit/mailman2) which requires an ancient :moyai: deprecated Python `2.7.9` which would really cause issues with my raspbian python installation path. Containers typically have less [overhead](https://en.wikipedia.org/wiki/Overhead_(computing)) than [Virtual Machines](https://en.wikipedia.org/wiki/Virtual_machine): because they don't emulate hardware or run a separate kernel (OS + Services). However, poorly optimized containers can sometimes have performance issues that make them less efficient than well-optimized VMs. If used properly however, people have reported being able to run over 50+ containers simultaneously on a Pi 4. The finesse of a container comes from its special ability to choose which dependencies it should get it self and which dependencies to reuse from the host machine. Pihole might need a different Python version but it will use the raspbian kernel's function to read files. 
<br/><br/>

The [details of how containers work](https://opensource.com/article/18/8/sysadmins-guide-containers) and their optimizations are beyond the scope here, container technology [runs very deep](https://opencontainers.org/about/overview/), so for today I give you permission to imagine them as tiny custom linux envs. Containers make it easy to slowly build and test the custom environment needed by some software, but there is always the option to just [install pihole normally in one command](https://github.com/pi-hole/pi-hole/?tab=readme-ov-file#one-step-automated-install) like any other application on your computer or [phone](https://github.com/DesktopECHO/Pi-hole-for-Android) if you're not [worried about your environment](https://en.wikipedia.org/wiki/Climate_change) (skip to Tailscale Section). You don't need a Raspberry Pi or Raspbian, you can run containers on Windows using the Linux kernel from [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) and on MacOS using a Linux kernel from [Lima](https://lima-vm.io/). At the minimum I recommend having an ethernet connection on the computer you decide to host the DNS software. The code blocks below are for Raspbian but I will include links to instructions for other OSes. After installing the required softwares everything should behave the same so later on there won't be any need for alternate instructions. Let's gather all the tools we will need to run containers:
<br/><br/>

1. First we will need podman. [Other OSes](https://podman.io/docs/installation). Raspbian:
```shellsession
$ sudo apt-get -y install podman
```

2. Next, to make working with podman simple, we will be using `podman-compose` to run scripts we will use to configure the containers. [Other OSes & Alternate Methods](https://github.com/containers/podman-compose?tab=readme-ov-file#installation). Raspbian.
```shellsession
$ sudo curl -o /usr/local/bin/podman-compose https://raw.githubusercontent.com/containers/podman-compose/main/podman_compose.py
$ sudo chmod +x /usr/local/bin/podman-compose
```

3. Finally, lets just make sure that everything is working fine. All OSes:
```shellsession
$ podman-compose -v
# Expected Output:
#   podman-compose version xxx
#   podman version xxx
```

<br/><br/>

### *Step 2:* Pi-Hole
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Hackers are crafty and its hard to tell where attacks might come from. Instead of losing to infinite attacks and their infinite solutions lets always focus on the biggest threats. Pi-Hole is open-source software, meaning that anyone could analyze its code and potentially discover vulnerabilities to exploit, such as gaining shell access on the computer running the software. Using [rootless containers](https://www.redhat.com/en/blog/rootless-containers-podman) would be beneficial here because a shell exploit would not grant the attacker full root access to the host, only access to the container which has its own very limited user which wouldn't let them do much except change the containers contents. In this case, gaining access to pihole or unbound containers specifically could be dangerous because the content being change would be the DNS configuration files possibly mixing up DNS requests to send us to a malicious computer's IP. In a later section we will cover how to mitigate these risks by limiting who can access Pi-hole to prevent them from trying this.

#### Trust & Paranoia (Security)
Another way to mitigate the risk of a pihole hack is to simply take a look at [this list of people](https://github.com/pi-hole/pi-hole/graphs/contributors). If you can't trust the 221+ people who wrote pihole you can spend 10 minutes checking [their code](https://github.com/pi-hole/pi-hole) for [crazy hax](https://www.youtube.com/watch?v=zEd4Vw2bmBE). If you're really paranoid show your worth and just rewrite the whole thing in assembly yourself. The same people that could find an exploit in pihole could very well also just submit it as a patch and become a contributor:100: #opensourcegang. Security is fundamentally about understanding your adversary: if you don't know your enemy, you won't know what to defend against. If your enemy is Nintendo then do not post any of your teams personal information online because they will find you anywhere in the world. If your enemy is Open AI... [run](https://www.pbs.org/newshour/nation/openai-whistleblower-who-raised-legal-concerns-about-chatgpts-datasets-has-died). Real security however is not about attaccs and haxors its about **trust**. The prevailing modern network security isn't about preventing the enemy attack. It's about not even letting them get the chance by [trusting no one](https://en.wikipedia.org/wiki/Zero_trust_architecture). This is great you can build a whole OS on your own, but after making software everyone arrives at the same next step; how do I share this? 
<br/><br/>

Let's start with the first magic of the modern internet. IP addresses enable computers and phones in different parts of the world to connect [in milliseconds](https://wondernetwork.com/pings/Seoul) for less than cents—a speed and price scale that never communication. To keep track of the billions of devices we connect together to make the internet we combine the IP system with the Domain Name System. In order to make a website findable 'on the internet' / findable by people who pay for "an internet connection", you have to get a DNS record into the Root DNS Servers. There are many ways to accomplish this but once your computer's IP Address is in the root nameservers everyone will be able to find you. These Root DNS Servers are like the actual authentic phonebook for the internet. Root DNS Servers are where the computers are that are publicly asking to be connected to like this blog and `google.com` live. These DNS Servers at the end of the chain when asking for an IP. Being in this table is what it means to have a website be "on the internet". There are many large networks that either don't use DNS for routing like the onion network or use a privately hosted DNS server controlled by an organization. This is how companies and universities work, once you are connected to a company VPN your DNS requests go to your company and therefore you can find the organization's computers that aren't accessible to people who just pay for internet. This is also how content is moderated by network owners like blocking twitter on work computers. If we setup our pihole + unbound to go to root nameservers as the unbound guide suggests we mitigate the risk of using a DNS server that is not actually giving us the true phone numbers by going straight to the real phonebook. The problem that arises is that root name servers don't offer [DNS over HTTPS](https://en.wikipedia.org/wiki/DNS_over_HTTPS) or [DNS over TLS](https://en.wikipedia.org/wiki/DNS_over_TLS) meaning all root nameservers requests are potentially editable by our ISP, which in my case, is Xfinity. It's not a problem for me I just think Xfinity has poor customer service and their provided router is bad but past that im not too frustrated about their advertising and tracking. China blocks all encrypted DNS traffic, so no DNS over TLS, and all DNS requests are sent to a DNS Server maintained by the state where requests are used to log suspicious citizens and block access to material the state considers dangerous, a system sometimes referred to as [The Great Firewall of China](https://en.wikipedia.org/wiki/Great_Firewall). Turkey and Iran block access to journalism critical of the government by interfering with DNS responses looking for websites blacklisted by the State. In the case where you can't trust your ISP or your Government **you will have to** pick someone else to trust to find computers and routes to them. We all have to trust someone because none of us alone knows where all the computers are. I don't know these methods so I can't help. The best case for you is to setup an encrypted exit node and have all your DNS and requests access the internet from there.  When I said *How did we get here* I meant this blog post, why did i start it? The enemies I am interested in locking out aren't my ISP or my Government but rather just authoritarian public wifi providers like Starbucks, their ISPs, and others connected to that network. 
<br/><br/>
From [the pihole post](https://docs.pi-hole.net/guides/dns/unbound/) that got us here I knew I was going to have to use unbound so i started by combining the compose scripts for [pihole compose](https://hub.docker.com/r/pihole/pihole) and unbound [unbound](https://hub.docker.com/r/klutchell/unbound). Compose scripts are used to describe to podman how you want your containers brought up. Theres a couple of important pieces so lets take a look at the file:

```yml
# Podman Compose configuration for rootless setup
networks:
  hole_net:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "192.168.2.0/24"  # IPv4 subnet
        - subnet: "fd14:d095:b9ef:80f2::/64"  # IPv6 subnet

services:
  unbound:
    container_name: unbound
    image: docker.io/klutchell/unbound:latest
    volumes:
      - type: bind
        read_only: true
        source: ./unb-conf
        target: /etc/unbound/custom.conf.d
      - type: bind
        read_only: true
        source: /etc/ssl/certs/ca-certificates.crt
        target: /etc/ssl/certs/ca-certificates.crt
    restart: unless-stopped
    networks:
      hole_net:
        ipv4_address: 192.168.2.3

  pihole:
    container_name: pihole
    image: docker.io/pihole/pihole:latest
    ports:
      - "1053:53/tcp"  # Map DNS TCP to unprivileged port
      - "1053:53/udp"  # Map DNS UDP to unprivileged port
      - "30080:80/tcp" # Admin interface
    environment:
      TZ: 'America/Detroit'
      WEBPASSWORD: ''  # Set your Pi-hole password
      DNSMASQ_LISTENING: 'all'
      PIHOLE_DNS_: "192.168.2.2#5335"  # Forward DNS to Unbound
    volumes:
      - './etc-pihole:/etc/pihole'
      - './etc-dnsmasq:/etc/dnsmasq.d'
    restart: unless-stopped
    networks:
      hole_net:
        ipv4_address: 192.168.2.3
    depends_on:
      - unbound
```

We don't need to use unbound's [redis integration](https://github.com/ar51an/unbound-redis) for caching DNS requests because this will be taken care of by pihole's [FTLDNS](https://docs.pi-hole.net/ftldns/dns-cache/) "Faster Than Light DNS" includes a caching feature that will take care of that. Running the [the official Pi-Hole compose scripts](https://hub.docker.com/r/pihole/pihole) causes issues due to podman's [aardvarkdns](https://github.com/containers/aardvark-dns) taking up port 53 on the host. Aardvark helps translate container names into their virtual IP addresses. Computers can be associated with multiple IPs and *hostnames* that can be used to find them on different networks. Later each of our computers will receive that IP i mentioned from Tailscale which is it's address on the tailnet. To get around [this aardvark issue](https://github.com/containers/podman/discussions/14242) we will map pihole's port 53 to a specific IP's port 53. Port 53 was already in use for some of my computer's IPs, the ones related to podman, but it was free to bind for my LAN IP `10.0.0.2` and my tailnet IP `<redacted pi tailscale ipv4>`. Now these 2 IPs are listening for DNS requests on port 53.

The compose file above also contains a `WEBPASSWORD` and forward pihole's port 80 to the host. Check if pihole started up fine by visiting `10.0.0.2/admin` in a web browser. You should be greeted with an admin portal where you can login using `WEBPASSWORD`. After logging in there are a couple settings we will need to modify:
<br/><br/>

1. Under *Settings* > *DNS* > *Upstream DNS Servers* we will have to tell pihole where to find unbound. In the compose file we put the pihole container and unbound on the same container network and gave them the IPs `192.168.2.3` and `192.168.2.2` respectively. The syntax for this entry is slightly different because the port is separated with a `#` whereas usually ports are described using `:` so be careful: ![Pi-Hole DNS Settings](/2/piholeset.png)

2. To support DNS requests over the tailnet we will have to disable the hop-based filtering in *Interface Settings* right under the *Upstream DNS Server* section, but don't worry, we will secure our whole network after we get everything up.

3. I found that DNSSEC worked properly when unchecked and improperly when checked probably due to unbound but you are welcome to do your own research. Check the first 2 options under *Advanced DNS Settings* for speed and security unless you have some other sort of setup you are going for.

### Pi-Hole
Next I installed tailscale on my pi [tailscaleddl](https://tailscale.com/download) and used $ tailscale up --accept-dns=false --advertise-exit-node to start tailscale on the pi. This will allow it to be used as the DNS server and it allows it to act as a VPN for my phone.

On my Pixel 6 I set my Private DNS to Automatic or Off (I couldn't find a difference). Setting the 'Private DNS provider hostname'  didn't work either for any hostname I tried as it doesnt take ips. I set the VPN to 'Always-on VPN' and 'Block connections without VPN'. For WiFi I have Static DHCP with the pi's local and tailscale ipv4 since it only takes ipv4s.

To allow connections to my computers and routter gateway i used tailscales subnet routing

After everything is said and done:
