---
title: 使用 Cloudflare Tunnel 给 Huggingface Space 自定义域名
date: 2026-01-15 15:08:57
tags:
  - cloudflare
  - huggingface
  - 域名
categories:
  - 技术
cover: https://imgu.falnsakura.top/PicGo/2026/01/08a2f37dd491dddc67c1bff5fc9dad0d.png
---
Huggingface 其实也是个大善人，有免费的 2c **16g** 的 space 让你免费用。
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/699393cac6b7db80bd770cf4303357f2.png)

美中不足的是普通版不能自定义域名，那么就用 cf tunnel 给他反代一下。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/f806981cd8866f7751574bf26bb7d401.png)

>Cloudflare Workers 也可以反代抱抱脸空间，但是会占你访问额度，也有CPU时间限制。。。
>如果你需要 Websocket 也有点麻烦。。。

### 前置条件

- 一个 Cloudflare 账号
- 一个已托管在 Cloudflare 的域名
- 一个 dockerhub 账号
- 一个 github 账号
- 一个运行中的 Huggingface Space

### 开始
#### 创建 Cloudflare Tunnel

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名
3. 进入 **Zero Trust** > **Networks** > **Tunnels**
4. 点击 **Create a tunnel**
5. 选择 **Cloudflared**，输入隧道名称（如 `huggingface-space`）
6. 点击 **Save tunnel**
#### 配置 Tunnel

创建完成后，你会看到安装 cloudflared 的命令，但我们**不需要安装**，因为我们只用它做反向代理。

复制那个 `ey`开头的 base64 token 备用。

#### 配置公共主机名

1. 在 Tunnel 详情页面，切换到 **Public Hostname** 标签
2. 点击 **Add a public hostname**
3. 填写配置：
	具体配置看你的容器，需要监听什么端口，什么协议，以`open-webui`为例
	- **Subdomain**: 输入子域名（如 `chat`）
	- **Domain**: 选择你的域名
	- **Type**: 选择 `HTTP`
	- **URL**:  由于和 openwebui 镜像打包在一起，填`localhost:7860`
4. 点击 **Save hostname**

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/76956f3a442d2a38fef141ba59bff5e8.png)
配置保存后，Cloudflare 会自动创建 DNS 记录并配置 Tunnel。通常在几分钟内即可生效。
### 使用 Github Actions 自动构建镜像

直接在 hf space 的 Dockerfile 里把 cloudflared 镜像是不行的，你的 space 会被秒封(pause)。于是，你必须预先打包好镜像，把想要部署的镜像和 cloudflared 打包在一起。

你可以直接 **Fork** [我的仓库](https://github.com/Fallensakura715/actions-auto-build)。

以下是自己操作的流程。
新建一个仓库，仓库根目录创建Dockerfile。
这里以 `open-webui` 为例，镜像、端口和依赖安装自己改一下。

```Dockerfile
FROM {你想部署的镜像}

USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=cloudflare/cloudflared:latest /usr/local/bin/cloudflared /usr/local/bin/cloudflared

ENV PORT=7860
ENV HOME=/tmp

EXPOSE 7860

CMD cloudflared tunnel --no-autoupdate run --token ${ARGO_AUTH} & bash start.sh
```

创建 Github Actions Workflow
在仓库 `.github/workflows`下创建 `docker-build.yml`
写入以下配置：

```yaml
name: Build and Push Open-WebUI-Argo

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

env:
  DOCKER_IMAGE: {你的用户名}/{你的镜像名}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.DOCKER_IMAGE }}:latest
            ${{ env.DOCKER_IMAGE }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 把镜像推送到 Dockerhub

去 [Dockerhub](https://hub.docker.com/) 的 `Account Settings > Settings > Personal Access Tokens` 拿到你账号的token。

>你想推到 **GHCR** 也可以的，记得把你的 **GHCR** 镜像设为公开

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/14009519563a037c76401330a30c65a0.png)

创建新 token，填好名称，例如`github actions`。
类型至少选 `Read & Write`。
token只会展示一次，复制形如 `dcr_xxx` 的 token 备用。

### 添加 Github 仓库环境变量

进入你仓库的 `Settings > Secrets and variables`
如果让你创建环境，随便创建一个就行。
填入如下两个 **`secrets`**：

>注意：必须是 **`secrets`** 而不是 variables

- `DOCKERHUB_TOKEN`，填入你上一步获得的 token
- `DOCKERHUB_USERNAME`，填入你`dockerhub`的用户名

>如果是 **非public** 的 GHCR 镜像仓库，你需要填的是 github user token，workflows配置文件也需要修改推送和登录部分

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/7e99064cb6260a1446b7c95e8a876977.png)

等待 Actions 跑完成功即可

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/ead1f2d9ef1ff902e29450e1a1636cd7.png)
### 修改你的 HF Space

把你 Huggingface Space 仓库的 Dockerfile 修改为拉你自己打包的新镜像。
还是以我的`open-webui`为例
```Dockerfile
FROM docker.io/你的用户名/镜像名:标签
```

如果是 GCHR 仓库：
```Dockerfile
FROM ghcr.io/你的用户名/镜像名:标签
```

在你的 hf space 环境变量添加一个 **secret** 变量，填入你的 cloudflared token。
`ARGO_AUTH`=`eyJxxxxx`

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/175e6586097d1113f74f16bfdc72ab44.png)

### 等待生效

启动你的 HF Space，去你的 cf tunnel 查看状态，为正常 tunnel 就没问题
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/7d517b93615a702b4cee71db68301d1c.png)

访问你配置的域名（如 `https://demo.yourdomain.com`），就能看到你的 Huggingface Space 了！

### 添加访问控制

你可以使用 Cloudflare Access 为你的 Space 添加身份验证：
1. 在 Tunnel 的 Public Hostname 设置中
2. 找到 **Access** 部分
3. 创建访问策略，可以设置：
	- 邮箱白名单
	- GitHub OAuth
	- Google OAuth
	- auth0, keyloack...
### 自定义缓存规则

既然用了 cf，那就不得不说他的 CDN 服务了，静态资源多的可以试试。
在 Cloudflare Rules 中可以为你的域名设置：
- 缓存策略
- 防火墙规则
- 速率限制
### 其他

如果使用 **HTTPS** ，一般都是 nginx 反代的，记得在 tunnel 设置里关闭 TLS 验证，开启 **`HTTP/2`**访问。

**gRPC** 的话要去你的域名设置页面开启 **`通过gRPC访问你的域名`**。

---
通过 Cloudflare Tunnel (Cloudflare Workers也是可以的)，我们可以轻松为 Huggingface Space 绑定自定义域名，无需任何服务器，完全免费。这个方法同样适用于其他需要反向代理的服务。

关于优选加速访问，cf tunnel 可以通过 SaaS 优选哦。

>[!CAUTION]
>谨慎使用，千万不要在 Space 明文使用 cf tunnel，否则你的 space 会喜提秒封。

>[!CAUTION]
>也不要在 Huggingface Space 部署 AList，也会秒封。

**相关链接**：
- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Huggingface Spaces 文档](https://huggingface.co/docs/hub/spaces)