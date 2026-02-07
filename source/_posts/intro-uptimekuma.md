---
title: Uptime Kuma，颜值与实力并存的开源监控神器
date: 2026-02-02 20:20:24
tags:
  - UptimeKuma
  - 监控
  - 保活
  - 资源
categories:
  - 技术
cover: https://imgu.falnsakura.top/PicGo/2026/02/44f13e88e98848abca4641ccebcf4a87.png
---
市面上有许多成熟的监控服务，比如 UptimeRobot 或 StatusCake，但它们往往存在免费版限制（如监控频率低、数量少）或者界面老旧、功能收费等问题。至于 Zabbix 或 Prometheus，对于轻量级需求来说，配置又显得过于厚重。

那么就得请出一款**开源、免费、界面现代且功能强大**的自托管监控工具——**Uptime Kuma**。

## 什么是 Uptime Kuma？

[Uptime Kuma](https://github.com/louislam/uptime-kuma) 是一个由开发者 [Louis Lam](https://github.com/louislam) 编写的自托管监控工具。它的定位非常清晰：**做一个像 UptimeRobot 样子的自托管监控工具，但要在 UI 和体验上更进一步。**

它基于 Vue 3 和 Node.js 构建，拥有极具现代感的响应式界面（Material Design 风格），并且支持中文。

它可以用来监控服务，设置定时任务(自动签到)，平台保活，消息推送等等。

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/44f13e88e98848abca4641ccebcf4a87.png)

## 为什么选择 Uptime Kuma？

Uptime Kuma 凭借以下几个核心优势成为了我的首选：

### 极其丰富的监控类型

不仅仅是简单的 Ping 或 HTTP 请求，它支持多种协议：

- **HTTP(s)**：支持关键字检测、重定向检查。
- **TCP / Ping**：基础连通性测试。
- **DNS**：检查域名解析。
- **Push**：类似于“心跳检测”，适合监控内网脚本是否按时运行。
- **Docker 容器**：可以直接监控 Docker 容器的运行状态。
- **数据库**：支持 MySQL/MariaDB, PostgreSQL, Redis 等。
![image.png](https://imgu.falnsakura.top/PicGo/2026/02/0509a1f408b681af774d078e1e632a91.png)

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/26aee515b0f4ac17f26674978476a791.png)

### 强大的通知渠道

监控到了故障，通知不到位也是白搭。Uptime Kuma 集成了 **90+ 种**通知方式，几乎覆盖了所有主流平台：

- **国内常用**：Telegram, 企业微信, 钉钉, 飞书, 阿里云短信, ServerChan。
- **国际常用**：Discord, Slack, Microsoft Teams, Pushover, Signal。
- **通用**：Email (SMTP), Webhook。

这意味着，当你的网站挂掉的那一秒，你的手机就能立刻收到弹窗警告。
### 漂亮的自定义状态页

你想给用户展示当前系统的运行状况吗？Uptime Kuma 内置了状态页生成功能。你可以将特定的监控项映射到状态页，绑定自定义域名，并配置 SSL。它生成的页面简洁美观，完全可以替代付费的 Status Page 服务。
### 极致的轻量与易用

- **资源占用低**：跑在一个 1核 512M 的 VPS 上都绰绰有余，我跑在了 GCP 的 2C1G 的 VPS 上。

	![image.png](https://imgu.falnsakura.top/PicGo/2026/02/911f2ca195931cfba71a5f8f93564536.png)

- **部署简单**：基于 Docker，一行命令即可启动。
- **界面友好**：全图形化操作，无需编写复杂的 YAML 配置文件。
## 上手指南

最简单的部署方式是使用 Docker。

### 部署安装

打开你的终端，运行以下命令（创建一个卷以持久化数据）：

```bash
# 创建一个卷
docker volume create uptime-kuma

# 启动容器
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

如果你更喜欢使用 `docker-compose.yml`，可以使用以下配置：

```yaml
version: '3.3'

services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    volumes:
      - ./uptime-kuma-data:/app/data
    ports:
      - 3001:3001  # <Host Port>:<Container Port>
    restart: always
```
### 初始化设置

1. 在浏览器中访问 `http://你的IP:3001` 或者 Nginx 的反代地址。
2. 第一次访问会要求你创建一个管理员账号和密码。

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/03860e7e0585a0a8fd1098074a1f306d.png)

3. 登录后，你就可以看到空空如也的仪表盘了。

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/302c34633e34c55f36d76cf7707e2194.png)


### 添加第一个监控

1. 点击左上角的 **“+ Add New Monitor”**。
2. **Monitor Type**选择 HTTP(s)。
3. **Friendly Name**填入你的网站名（例如：我的博客）。
4. **URL** 填入网址。
5. **Heartbeat**：默认 60秒，你可以设置得更短，比如 20秒（这是免费版 UptimeRobot 做不到的）。
6. 点击右下角的 **“保存”**。

### 配置通知

1. 点击右上方的头像 -> **“设置”** -> **“通知”**。
2. 点击 **“设置通知”**。
3. 选择你喜欢的类型（例如 Telegram 或 钉钉），填入相应的 Token 或 Webhook URL。
4. 点击 **“测试”**，确认收到消息后保存。

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/93463c0de33e02fb856a59339afe8c5f.png)

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/a5c6325beb21f233278a0abf899006ce.png)

### 对外显示

1. 点击右上方的 **Status Pages** -> **“设置”** -> **“通知”**。
2. 点击 **“+ New Status Page”**。
3. **Name** 填你 Status Page 显示的标题名字
4. **Slug** 填你 Status Page 的路径，默认是`/status/default`

![image.png](https://imgu.falnsakura.top/PicGo/2026/02/622753e8db9b86ab54b98ba8b1b5c4a6.png)

5. 点击 **Edit Status Page**
6. 点 **+ Add Group** 添加分组，点 **Add a monitor** 添加监控服务
---
## 进阶玩法

- **反向代理**：为了安全，建议使用 Nginx 或 Caddy 对 3001 端口进行反向代理，并配置 SSL 证书，通过 HTTPS 访问面板。SSL 证书可以用 certbot 获取。

```nginx
server {
    listen 443 ssl;
    server_name your_domain;

    ssl_certificate /etc/letsencrypt/live/inst.falnsakura.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inst.falnsakura.top/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

- **双机热备**：有些极客会买两台便宜的 VPS 互相同步监控，防止“监控服务器本身挂了”的尴尬情况。
- **维护模式**：当你需要对服务器进行例行维护时，可以开启维护模式，暂时抑制报警通知。
- **自动签到**：[抓取你需要签到网站的签到接口](https://www.falnsakura.top/2026/01/HTTP%E3%80%81Cookie%E4%B8%8EOAuth%E8%AE%A4%E8%AF%81%EF%BC%9AAPI%E9%80%86%E5%90%91%E4%B8%8E%E5%90%8E%E7%AB%AF%E6%95%B0%E6%8D%AE%E7%9A%84%E6%8A%93%E5%8F%96/)，加上 **Bearer Token** 或者 **Cookie** 之类的凭证。

	![image.png](https://imgu.falnsakura.top/PicGo/2026/02/268d483f4f900b5ff38d3c19a6f59b73.png)

- **网站保活**：比如防止 Hugging Face Space 休眠，定期 curl 你的网站就好了，建议一天一次就够了。
- **接入谷歌分析**：在左侧填入你的 Google Analytics ID 即可

	![image.png](https://imgu.falnsakura.top/PicGo/2026/02/4a43364668dc362aa3d122709a6dca01.png)


- **自定义样式**：用 CSS 注入的方式

	![image.png](https://imgu.falnsakura.top/PicGo/2026/02/416f0035ec6964b129c13a7e32702302.png)

## 总结

**Uptime Kuma** 完美诠释了什么是优秀的开源软件：解决痛点、界面美观、简单易用且完全免费。如果你正在寻找一个能够掌控自己服务状态或者自动签到、服务保活的工具，Uptime Kuma 绝对是目前最好的选择之一。

赶紧去给你的服务器装上这个“贴身保镖”吧！

---

_相关链接：_

- _GitHub 项目地址: [https://github.com/louislam/uptime-kuma](https://github.com/louislam/uptime-kuma)_
- _如何抓接口地址: [https://www.falnsakura.top/2026/01/HTTP%E3%80%81Cookie%E4%B8%8EOAuth%E8%AE%A4%E8%AF%81%EF%BC%9AAPI%E9%80%86%E5%90%91%E4%B8%8E%E5%90%8E%E7%AB%AF%E6%95%B0%E6%8D%AE%E7%9A%84%E6%8A%93%E5%8F%96/](https://www.falnsakura.top/2026/01/HTTP%E3%80%81Cookie%E4%B8%8EOAuth%E8%AE%A4%E8%AF%81%EF%BC%9AAPI%E9%80%86%E5%90%91%E4%B8%8E%E5%90%8E%E7%AB%AF%E6%95%B0%E6%8D%AE%E7%9A%84%E6%8A%93%E5%8F%96/)_
