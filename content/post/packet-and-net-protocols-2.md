---
date: 2026-11-09T16:56:53+08:00
draft: true
title: 你的数据包长什么样？代理协议的报文结构及流量特征分析（二）
slug: packet-and-net-protocols-2
tags:
  - 抓包
  - 网络协议
  - 网络基础
categories:
  - 技术
image:
---

本章是基础知识最重要的一章，也是理解后面各种基于 TLS 协议的基础。

## 必要的基础知识(二)

### TLS 的加密、握手、证书与身份验证

TLS 处于应用层（如 HTTP、SMTP、DNS）与传输层（TCP）之间，旨在为上层应用通信提供端到端的数据机密性、完整性校验与身份验证。它是早已被废弃的 SSL 协议的现代官方继承者，也是 Web 浏览器中 HTTPS 安全连接的底层支撑。

当前互联网主要运行 TLS 1.2（RFC 5246）与 TLS 1.3（RFC 8446）。TLS 1.3 相比 1.2 移除了静态 RSA 密钥交换、CBC 分组模式及脆弱哈希算法，将完整握手时延从 2-RTT 缩减至 1-RTT。

下面以**常见的 TLS 1.3、基于证书的完整握手**为例。

TLS 1.3 采用“推测式密钥协商”，客户端在发送 `ClientHello` 时就直接预测服务端支持的椭圆曲线 (`X25519`、`X25519MLKEM768` 等) 并生成公钥分片（Key Share），从而在 1 个往返内完成握手：
![image.png](https://imgu.falnsakura.top/PicGo/2026/11/bce288898c6666c1ce5ac49459a2d667.webp)

#### ClientHello：客户端提出协商条件

一个 TLSv1.3 的 ClientHello 包长这样：
![08b4f510-1511-4e71-adb2-ecf9281334e8.png](https://imgu.falnsakura.top/PicGo/2026/11/8b5ad7bbedb57fa40d4eff5b0a0f037c.webp)
![image.png](https://imgu.falnsakura.top/PicGo/2026/11/d0b9b7fd0e9a4bbd36d0e4c022d2bf5c.webp)

- **`legacy_version`**：固定填 `0x0303`（即 TLS 1.2）。TLS 1.3 为了通过某些老旧防火墙/中间件，将实际版本协商移入扩展字段中。
- **`random`**：32 字节密码学安全伪随机数。包含客户端时间戳或随机熵，用于抵御重放攻击，并在防降级机制中充当校验标记。
- **`legacy_session_id`**：在 TLS 1.3 中已弃用，但在向后兼容模式（Middlebox Compatibility Mode）下可填充伪随机字节，避免中间设备断开连接。
- **`cipher_suites`**：支持的 AEAD 加密套件列表。TLS 1.3 只保留了 5 种，典型如：
    - `TLS_AES_128_GCM_SHA256` (0x1301)
    - `TLS_AES_256_GCM_SHA384` (0x1302)
    - `TLS_CHACHA20_POLY1305_SHA256` (0x1303)

**关键 Extensions（扩展字段）**：

- `supported_versions`：**强制字段**。必须显式声明包含 `0x0304`（TLS 1.3），服务端根据此字段决定采用 1.3 还是 1.2。
- `server_name`**（SNI）**：告知目标服务器的主机名（如 `api.example.com`），解决单 IP 多虚拟主机托管不同证书的路由问题。
	假设一台服务器或 CDN 节点，同时承载 `a.example.com` 和 `b.example.com` ，两者可能指向同一个 IP。客户端刚建立连接时，还没有发送普通 HTTP 请求，但服务器已经需要决定要使用哪张证书了。
	SNI 就在这个阶段告诉服务器：`我希望访问 a.example.com` 。
	没有 ECH 时，常见 TLS ClientHello 中的 SNI 会被路径上的人看到。
- `supported_groups`：客户端支持的椭圆曲线列表，如 `x25519` (0x001d)、`secp256r1` (0x0017)。
- `key_share`：客户端为上述曲线中优先级最高的曲线生成的临时公钥。例如选定 `X25519` 时附带 32 字节的公钥分片。
- `signature_algorithms`：客户端信任的数字签名算法列表，如 `ecdsa_secp256r1_sha256`、`rsa_pss_rsae_sha256`。

#### ServerHello：服务端确认协商参数

![7c7a547a-5888-42e3-86dc-482c654517cf.png](https://imgu.falnsakura.top/PicGo/2026/11/bf3986b8de1041f4b8f29f01a4165bc2.webp)
![image.png](https://imgu.falnsakura.top/PicGo/2026/11/91c6a7be569fae02f527d58de7bf35cb.png)

 - **`legacy_version`**：同样回写 `0x0303`。
- **`random`**：服务端的 32 字节随机数。
    - _防降级机制_：若服务端支持 1.3 但降级与客户端协商 1.2，其 `random` 尾部 8 字节会被强制设置为特定魔数 `444F574E47524401`（"DOWNGRD\x01"）；客户端收到后若发现降级异常会立即终止连接。
- **`cipher_suite`**：选定的单一加密套件（如 `TLS_AES_128_GCM_SHA256`）。
- **`extensions` -> `key_share`**：服务端对应曲线生成的临时公钥。
    - _注_：若服务端不支持客户端在 `key_share` 中提供的曲线，会回送 `HelloRetryRequest`（HRR），要求客户端更换曲线重新发送 `ClientHello`，握手自动退化为 2-RTT。

#### EncryptedExtensions

从这个字段开始，传输内容全部由协商出的临时密钥加密。它包含了原属于 ServerHello 但不影响密钥派生的扩展参数，例如 ALPN（协商应用层协议：h3、h2、http/1.1 等）。

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/bf8331e3c43b082009d44015ce548c19.png)

#### Certificate：服务端的身份凭证

包含一个完整的 X.509 证书列表（证书链），按顺序存放：**服务器叶子证书 -> 中间 CA 证书 -> （根 CA 证书，通常省略由客户端本地提供）**。

#### CertificateVerify：服务端向客户端证明自己真正拥有该证书对应的私钥

**计算机制**：服务端计算从 `ClientHello` 开始到此前所有已发/收握手报文的散列值（Transcript Hash），拼接上固定前缀与上下文字符串，用**证书对应的私钥**进行数字签名。

**客户端校验**：客户端用证书里的公钥解开此签名，若与本地计算的报文哈希一致，即证明服务端拥有对应私钥，防止中间人伪造证书。

证书验证是抵御中间人攻击（MITM）的核心环节。

##### 证书链与 X.509 验证流程

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/172ec67f37916debe530b8c47fcfa5d6.webp)

客户端收到服务器证书后，按如下流水线严格校验：

1. **域名匹配**：
    - 提取访问 URL 中的域名，与叶子证书中的 `SAN` 扩展做字符串/通配符匹配（优先使用 SAN，忽略陈旧的 `Common Name`）。不匹配则触发 `SSL_ERROR_BAD_CERT_DOMAIN`。
        
2. **有效期校验**：
    - 以本地受信任时间戳为基准，必须满足：$\text{Not Before} \le \text{Current Time} \le \text{Not After}$。
        
3. **信任锚点寻址与证书链构建**：
    - 根据叶子证书的 `Issuer` 查找握手报文中附带的中间证书。
    - 再由中间证书查找其父级，直至在操作系统/浏览器的根证书信任库中找到自签名的根 CA（Root CA）。找不到则直接报错（不可信签发机构）。
        
4. **密码学签名校验**：
    - 对证书链中每一级证书 $N$（从叶子到根）：
    $$\text{Hash} = \text{SHA256}(tbsCertificate_N)$$
    $$\text{Verified} = \text{VerifySignature}(\text{PublicKey}_{N+1}, \text{Hash}, \text{SignatureValue}_N)$$
    - 用父证书的公钥解密并核验子证书的签名。
        
5. **约束与权限校验**：
    - 检查中间证书的 `Basic Constraints` 是否标记了 `CA:TRUE`。
    - 检查路径长度限制（`pathlen`）：若 `pathlen=0`，该中间 CA 绝不能签发下一级中间 CA。
    - 检查 `Key Usage` 是否允许签署子证书（`keyCertSign`）。
        
6. **吊销状态检查**
    - **CRL（证书吊销列表）**：下载 CA 定期发布的已作废证书序列号黑名单（延时高、体积大，已逐步淘汰）。
    - **OCSP（在线证书状态协议）**：向 CA 的 OCSP 响应服务器发送请求查询序列号状态（有延迟且暴露用户访问隐私）。
    - **OCSP Stapling（装订）**：服务端定期向 CA 请求带签名的 OCSP 响应，在 TLS 握手的 `Certificate` 阶段直接附带给客户端，由客户端离线校验 CA 签名，兼顾安全与性能。

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/decef52301bc888a3379b4a85974c95d.png)

TLSv1.2 的证书不是加密的，可以直接抓包看到，图中四张证书就是证书链，第一张是叶子证书，后面每一张用来签发前一张，一级一级往上。

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/789fc0b9f1cf83d62ea45d624d0c60b2.png)

可以看到第一张证书就是 `Let's Encrypt` 签发的叶子证书，

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/14d959c37f86123ef86ae14b91eb6474.png)

这是证书链的最后一张，它的 issuer 是 ISRG Root X1，所以它是 X1 签发的一张交叉签名证书。Let’s Encrypt 现在的默认 ECDSA 链是：EE ← YE1 ← Root YE ← ISRG Root X2 ← ISRG Root X1，正好是 4 张加一个不发送的根。

经常给自己域名申证书的都知道，Caddy 和 Certbot 的证书都是 Let's Encrypt 签的。

##### 针对 TLS 的 MITM (中间人攻击)

中间人攻击（Man-in-the-Middle Attack，简称 MITM）是指攻击者悄悄介入通信双方之间，拦截、监听、甚至篡改双方交互的数据，而通信双方却误以为正在与对方直接通信。

伪造/注入根证书可以直接 MITM 解密你的流量。

- **攻击原理**：抓包工具（如 Charles、Fiddler、Burp Suite）和企业上网行为审计（DLP/GFW）的工作本质就是“授权的 MITM”。
- **操作手法**：
	1. 攻击者动态生成一张颁发给 `example.com` 的证书，但签名者是攻击者自建的 CA（或伪造的根证书）。
	2. 如果受害者机器**已被植入恶意根证书**（例如通过恶意软件、公司 IT 统一推送策略或诱导用户手动安装），系统信任库（Trust Store）就会判定该伪造证书合法，TLS 握手顺利完成。
	3. 攻击者即可实时解密双向通信载荷。

你的浏览器常常会报错：
![image.png](https://imgu.falnsakura.top/PicGo/2026/11/50960280566ca0ffd8d9bbec02d2de06.png)

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/86a9ddf992fcc658542951e668878442.png)

这个是根证书 CA 不受信任。如果点了继续访问，就有被 MITM 解密你流量的风险。

~~第四篇会实操一下 MITM AnyTLS 协议的流量。~~

###### 证书绑定 (Pin 证书)

在移动 App、金融客户端内，硬编码预置目标服务器公钥的哈希值（Pin）。即使系统底层被安装了恶意根证书，只要 App 发现远程服务器的公钥与本地 Pin 不符，就直接断开连接。

#### Finished：握手状态的完整性自检

基于整个握手过程所有报文的 Transcript Hash，通过 HKDF 派生出的 `finished_key` 计算出 HMAC 校验码。双方各自生成并互相校验 `Finished`，确保没有任何中间人篡改过握手报文的任意一比特（防降级、防篡改）。