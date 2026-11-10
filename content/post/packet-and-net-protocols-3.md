---
date: 2026-11-09T16:56:53+08:00
draft: true
title: 你的数据包长什么样？代理协议的报文结构及流量特征分析（三）
slug: packet-and-net-protocols-3
tags:
  - 抓包
  - 网络协议
  - 网络基础
categories:
  - 技术
image:
---

## 必要的基础知识(三)

### Encrypted ClientHello (ECH)

前面已经看到：HTTPS 内容可以加密，但传统 ClientHello 中的 SNI 仍然可能暴露域名，ECH 就是为解决这个问题，对 ClientHello 进行加密。

可以把 ECH 理解为：客户端构造一份受到加密保护的内部 ClientHello，同时发送一份对外可见的外部 ClientHello。

#### 双 ClientHello

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/3021c5eaaaa672da73a3aab48a0cd1e4.webp)

#### ECH 完整握手与工作流程

ECH 的关键难点在于：**在尚未与服务器建立 TLS 连接前，客户端如何获取加密 `ClientHelloInner` 的公钥？**

这一问题依赖于安全的 DNS 记录（HTTPS / SVCB 资源记录，DoT，DoH）与 **HPKE（混合公钥加密标准）**。

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/e00947ac0ac1de1b72ee05549e237f35.webp)

1. 密钥分发（DNS HTTPS 记录）
	客户端通过 **DoH（DNS over HTTPS）** 或 **DoT（DNS over TLS）** 向受信任的 DNS 服务器请求目标域名的 `HTTPS` 记录（RFC 9460）。 返回的参数中包含 `ech` 字段（即 `ECHConfigList`），其内容包括：
	- **Public Name**：外层诱饵域名（如 `cdn-provider.com`）。
	- **HPKE 公钥**：服务端的长效非对称公钥。
	- **支持的 KEM/KDF/AEAD 算法**：如 `DHKEM(X25519, HKDF-SHA256)` + `AES-128-GCM`。
> 	**注**：如果 DNS 请求仍使用传统的明文 UDP 53 端口，中间人依然可以通过 DNS 嗅探出用户访问的目标，因此 **ECH 必须与加密 DNS（DoH/DoT）配合使用**。

2. HPKE 加密（Hybrid Public Key Encryption，RFC 9180）
	客户端利用 `ECHConfigList` 中的公钥，通过 HPKE 协议计算出一个共享密钥，并使用 AEAD 算法（如 AES-GCM）对序列化后的 `ClientHelloInner` 进行对称加密，生成密文（Payload）和一段临时公钥（Encapsulated Key, `enc`），嵌入 `ClientHelloOuter` 的扩展中。

3. 服务端处理与解密
	处于前端的 CDN 边缘服务器或反向代理网关收到 `ClientHelloOuter`：
	- **解密成功**：网关用本地持有的私钥解密 `encrypted_client_hello`，还原出 `ClientHelloInner`。随后完全丢弃 `ClientHelloOuter`，内部状态机重置，使用 `ClientHelloInner` 继续完成后续的 TLS 握手。
	- **解密失败（配置过期/公钥轮换）**：如果客户端使用的 ECH 公钥已被服务端淘汰，服务端会退而使用 `ClientHelloOuter` 完成外层握手，并在随后的 `EncryptedExtensions` 中返回最新的合法 `ECHConfigList`。客户端收到后自动静默重试，避免连接中断。

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/d11e91c7abaebdd1bd8958f031f8dd01.webp)

这是 Cloudflare 的 ECH，原本不加密的 SNI 就无法被看到，只有 `cloudflare-ech.com`。

![image.png](https://imgu.falnsakura.top/PicGo/2026/11/5aac67111af6fbd9bcc9503533ae9c7d.png)

### 连接复用、保活与填充

#### 连接复用

第一篇也讲过，建立一条安全连接的开销极高（TCP 握手 1-RTT + TLS 1.3 握手 1-RTT + 慢启动拥塞窗口调整）。连接复用的核心目标是尽可能减少新建连接的握手开销与握手往返延迟（RTT）。它在网络分层中存在多级实现：

1. HTTP 传输维度的复用演进

HTTP/1.1 持久连接：
- 通过 Connection: keep-alive 请求头指示对端在响应完成后不要关闭底层 TCP 连接，后续请求可直接串行复用同一条通道。
- 缺陷（HTTP 队头阻塞）：连接虽然复用，但请求与响应是严格 FIFO 串行的。如果前一个请求处理极慢，后续请求只能排队等待，无法并发。

HTTP/2 二进制分帧与多路复用：

- 在单条 TCP 连接上引入虚拟的“流（Stream）”概念，数据被拆解为带有 Stream ID 的独立二进制 Frame 。
- 不同流的帧可以交错发送，接收方根据 Stream ID 重新组装，实现了单连接内的全双工并发，消除了应用层队头阻塞。
遗留问题（TCP 队头阻塞）：底层依然是单个 TCP 流。只要中间发生一个数据包丢包，整个 TCP 窗口必须等待重传恢复，导致所有并发 Stream 全部卡顿。

HTTP/3 基于 QUIC 的真多路复用：

- 底层放弃 TCP 改走 UDP。QUIC 在传输层原生实现多个逻辑流，丢包仅阻塞受损的那一条流，其他流不受任何干扰，彻底根除队头阻塞。

#### 保活机制

#### 填充机制 (Padding)

### 被动流量分析、DPI 与主动探测



### 流量特征与指纹