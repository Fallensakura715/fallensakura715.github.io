---
title: 使用 Cloudflare R2 零成本搭建个人图床
slug: cloudflare-r2
date: 2026-01-13 10:37:05
tags:
  - cloudflare
  - 图床
  - S3
categories:
  - 技术
image: https://imgu.falnsakura.top/PicGo/2026/01/f5d9cc160407bb69415e8c9b45ae75dd.png
---
在写博客或者维护网站时，图片的托管一直是个让人头疼的问题。放在本地会增加 Git 仓库体积，使用公共图床又担心随时“跑路”。今天介绍如何利用 Cloudflare R2 搭建一个高速、稳定且几乎免费的个人图床。

另外，对象存储在折腾 serverless 的时候也是不可或缺的。
## 什么是对象存储？

在开始之前，我们需要了解什么是**对象存储**。

简单来说，对象存储是一种专门为大规模非结构化数据（如图片、视频、备份文件等）设计的存储架构。与传统电脑上的“层级文件系统”（文件夹嵌套）不同，对象存储将数据作为“对象”进行管理：

* **对象（Object）**：包含数据本身、元数据（Metadata）和全局唯一的标识符（ID）。
* **桶（Bucket）**：存放对象的容器。
* **特性**：它具有极高的扩展性和可靠性，通过 API 或 URL 直接访问，非常适合作为网站的静态资源存储。

常见的对象存储服务有亚马逊的 AWS S3、阿里云的 OSS 和腾讯云的 COS。

### 什么是 S3 API ?

**AWS S3 (Simple Storage Service)** 的 API 是目前云存储行业的**事实标准**。绝大多数的对象存储服务（包括 Cloudflare R2、阿里云 OSS、腾讯云 COS、MinIO）都完全兼容 S3 API。

理解了 S3 API 的用法，你就可以一套代码通用所有主流云存储。
#### 准备工作

在使用 API 之前，你必须拥有：
1. **Access Key ID** (访问密钥 ID)
2. **Secret Access Key** (私有访问密钥)
3. **Endpoint URL** (终结点，如果是 AWS 官方则不需要专门指定，如果是 R2 或自建 Minio 则必须指定)
4. **Region** (区域，如 `us-east-1`，R2 可以填 `auto`)
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/c21a7f159b648959889d24f62738abf8.png)

## 为什么选择 Cloudflare R2 ？

Cloudflare R2 是兼容 S3 标准的对象存储服务，它最大的杀手锏是：**免收出口流量费（Zero Egress Fees）**。

传统的云厂商（如 AWS 或阿里云）通常会对图片加载产生的流量收费，如果你的博客访问量大，这笔费用会很可观。而 Cloudflare R2：

**1. 每月前 10GB 存储免费**。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/b27077e30ca0fc6ee12ea1ab58791b11.png)

**2. 每月 A 类操作（写）100 万次免费，B 类操作（读）1000 万次免费**。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/3d969ddb34ac79b28e942bc965783d90.png)

**3. 完全没有流量费**。

对于个人来说，这几乎就是永久免费。
## 搭建步骤

### 1. 开启 Cloudflare R2

登录 Cloudflare 控制台，点击左侧菜单栏的 `R2`。你需要绑定一张信用卡或 PayPal 进行身份验证（虽然在免费额度内不会扣费）。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/4409c8c8a36a4daa3705533f520a6b94.png)

>如果 API 调用或者存储容量超了 Free Tier 会扣钱的
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/09a77ba692bbd15bfe8cefc5b3db7bab.png)

>我用的是工行星座卡（免年费😋），注册一个非国区 PayPal 也可以，能绑银联卡。

![fe04b05c774a9ced9931acc98d334641.png](https://imgu.falnsakura.top/PicGo/2026/01/f4f7779838a094ecfdf126facdeeecbd.png)
### 2. 创建 Bucket（桶）

点击 `Create bucket`，起一个名字（例如 `my-blog-images`），区域选择 `Automatic` 即可。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/9f0ae89c39f61919ba3802bfec7e8bc2.png)

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/c45b517cd587b1005a6d388e50ccd0f7.png)

### 3. 配置公开访问

R2 默认不允许公开访问，只能通过 API 访问。若想搭建图床之类的并能直接访问，需要配置有域名。

在 Bucket 详情页中，选择 `Settings` 选项卡：
* 找到 **Custom Domain**。
* 点击 **Add**，输入你的子域名（例如 `img.yourdomain.com`）。
* 这样你就可以通过自己的域名访问图片了，且自带 CDN 加速。
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/63e384cc54f9de5b890751d6d455287d.png)

>如果你的域名没有放在 Cloudflare 托管，可以将域名迁移到 Cloudflare，或者使用 Cloudflare Workers 中转。
>如果你只想搬子域名（例如 `img.abc.com`），可以在你原来的服务商那里，把 `img` 这个子域名的 **NS 记录** 指向 Cloudflare 分配给你的 NS 地址。这叫“DNS 委派”。
>如果在 Cloudflare ，cf 会自动帮你添加 DNS记录。


![image.png](https://imgu.falnsakura.top/PicGo/2026/01/f443956fbd30d12f35c64d8b0df2798e.png)

### 4. 获取 API 密钥
	
回到 R2 主页，点击右侧的 **Manage** ：
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/77a40acffcef2ef6d45b80504eda5fcb.png)

* 点击 **Create User API token**。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/c10e8781e73fe79d099862091ecfc06c.png)

* 权限选择 **Object Read & Write**。
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/5b6071e2f933ed3068a1e78f292fe29f.png)
* 保存好生成的 `Access Key ID` 和 `Secret Access Key`，以及 `Endpoint`。
## 配置 CORS 策略

**CORS (Cross-Origin Resource Sharing) 是一种安全机制。简单来说，由于浏览器的“同源策略”，默认情况下，域名 A 的网页不允许去读域名 B 的资源。

如果你在 `blog.com` 上引用了 `img.com` 的图片，并且你需要通过脚本（比如 Canvas 处理、图片懒加载插件等）去操作这张图片，就必须在 `img.com`（即 R2 存储桶）上明确允许 `blog.com` 的访问。

### 1. 进入设置界面

1. 登录 Cloudflare 控制台。
2. 点击左侧 **R2**，选择你创建好的 **Bucket（存储桶）**。
3. 点击上方的 **Settings** 选项卡。
4. 向下滚动找到 **CORS Policy** 部分，点击 **Add CORS policy**。
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/4341e285db6a4d67dc0d56c16add0477.png)

### 2. 填写配置文件
在弹出的编辑框中，复制并粘贴以下 JSON 代码：
```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```
## 配合 PicGo 实现自动化上传

手动上传图片很麻烦，我们推荐使用 **PicGo** 客户端：

1. 在 PicGo 中安装 `s3` 插件。

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/24a0dca488b42d1bd4088208fd8f09e5.png)

2. 配置插件参数：
* **应用密钥 ID**：你的 Access Key ID。
* **应用密钥**：你的 Secret Access Key。
* **桶名**：`my-blog-images`。
* **自定义节点**：你的 R2 Endpoint（去掉末尾的桶名部分）。
* **自定义域名**：你绑定的自定义域名（如 `https://img.yourdomain.com`）。
![image.png](https://imgu.falnsakura.top/PicGo/2026/01/420912d092611b7ba6094c8f1f0cd310.png)

> 可以配合图片压缩食用，节省存储空间，不会牺牲太多图片质量
## 把 PicGo 放到 Obsidian 实现图片无缝上传

1. 安装 `Image auto upload` 插件

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/d5856c40359e85599dfd931501638ad5.png)

2. 配置插件

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/2e692fdeebd3a3d303560ee6cd8b65c7.png)

配置完成后，在写 md 的时候把图片复制进来，图片会自动上传到 R2。再也不用操心传 md 还得传图片的问题了😋。
## 配置 Cloudflare 优选域名

如果嫌国内访问太慢，可以用 Cloudflare Workers 反代来配置 Cloudflare 优选域名。
```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'img.yourdomain.com';
    return fetch(url, request);
  },
};
```

再添加 Workers 路由，把 DNS 记录里的 CNAME 指向的域名改成 Cloudflare 优选域名即可。

优选前，只解析到了两个 IP

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/37ad2ade0c2312357a29635e61b745b3.png)

优选后

![image.png](https://imgu.falnsakura.top/PicGo/2026/01/b2adaa7d951fbc5a4d88f6a787e66b47.png)


搭建完成后，你就可以访问 `https://img.yourdomain.com/bucketname/path` 访问你的图片了。