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

#### QUIC 的 TLS 握手

虽然 QUIC 的握手包经过了加密，但是它的密钥是公开的，谁都能拿到然后解密，相当于 ClientHello 并没有加密。

### 连接复用、保活与填充

#### 连接复用

第一篇也讲过，建立一条安全连接的开销极高（TCP 握手 1-RTT + TLS 1.3 握手 1-RTT + 慢启动拥塞窗口调整）。连接复用的核心目标是尽可能减少新建连接的握手开销与握手往返延迟（RTT）。它在网络分层中存在多级实现：

- 连接复用（连接池）：同一条 TCP/TLS 连接反复使用，不用每次重新握手。省掉 TCP 三次握手和 TLS 握手，也避免短时间内向同一个 IP:端口反复发起大量 TLS 握手这种明显的行为特征。

- 多路复用（Multiplexing）：一条连接里同时跑多个逻辑流，每个流有自己的 ID。典型实现有 Mux.Cool、smux/yamux、HTTP/2 的 stream。

- 传输层多路复用：前面提到的 QUIC 就是一条 QUIC 连接里可以同时开很多个 Stream，每个 Stream 有独立的顺序和重传。某个 Stream 丢包，只阻塞它自己，其他 Stream 照常收发。这正好解决了前面说的 TCP 多路复用的队头阻塞问题：HTTP/2 在应用层有多个流，但底下仍是一条 TCP，丢一个包全部卡住。
 
#### 保活机制

保活机制用于在没有业务数据传输的空闲期，确认物理链路是否依然通畅、对端主机是否存活，并防止链路上的中间设备（NAT 网关、防火墙）因会话空闲超时而强制断开连接。

##### 1. TCP 传输层 Keepalive

TCP Keepalive 由操作系统网络栈维护，默认通过 Socket 选项 `SO_KEEPALIVE` 开启。

* **工作机制**：
	当连接在设定的空闲时间没有收到任何数据包时，本地协议栈会自动发送一个**不包含有效载荷的探测 ACK 包**（其序列号被设置为当前确认序号减 1：$\text{Seq} = \text{SND.UNA} - 1$）。对端收到后会回送一个正常的 ACK。
* **三个核心内核参数（Linux）**：
	* `tcp_keepalive_time`（默认 7200 秒 / 2 小时）：连接空闲多久后开始发送第一次保活探测。
	* `tcp_keepalive_intvl`（默认 75 秒）：若未收到响应，后续每次探测的重发间隔。
	* `tcp_keepalive_probes`（默认 9 次）：连续未收到响应达到该次数后，内核强制将连接置为失效，向应用层返回连接重置错误（ETIMEDOUT / ECONNRESET）。
* **主要作用**：
	1. **检测死链**：探测对端机器断电、内核崩溃、网线拔出等未发送 FIN 包的“静默死亡”。
	2. **维持 NAT 映射状态**：家庭路由器与运营商 CGNAT 网关维护着内存映射表（NAT Session Table）。若空闲超过超时时间（通常仅数十秒至几分钟），映射关系被抹去，后续入网流量将被直接丢弃。

##### 2. 应用层心跳

TCP Keepalive 的探测间隔过长，且无法判断“操作系统仍在线，但上层服务进程已死锁/崩溃”的情况，因此现代应用协议均自研应用层心跳：WebSocket ping/pong、HTTP/2 PING、OpenVPN 的 keepalive 指令，以及 AnyTLS 协议 v2 增强的超时处理和心跳。

这是双刃剑：规律的心跳（固定间隔、固定大小）本身就是指纹，所以有的协议会加随机化。

#### 三、 填充机制（Padding）

在加密协议中，密文经过加密并不等于完全隐藏信息。**密文的字节长度本身就是一种严重的元数据泄露**。填充机制从密码学数学要求演进为了抵御**流量分析**与**侧信道攻击**的关键工具。

##### 1. 密码学分组对齐填充

在 TLS 1.2 及更早版本中，使用 CBC 模式的分组对称加密（如 AES-CBC）时，明文必须被补齐到分组大小（如 16 字节）的整数倍：

- **PKCS#7 填充标准**：若缺 $K$ 个字节（$1 \le K \le 16$），则在尾部追加 $K$ 个值为 $K$ 的字节。
- *示例*：差 3 个字节时，追加 `0x03 0x03 0x03`。

- **填充预言机攻击**：
- 在“先算 MAC 再加密”的设计中，如果接收端解密时对“填充格式错误”与“MAC 校验错误”返回了不同的报错响应或不同的处理时间差（Timing Side-Channel），攻击者就可以逐字节调整密文并观察解密表现，完全逆推出明文内容（如经典的 Vaudenay 攻击、POODLE 攻击、Lucky 13 漏洞）。

- **结果**：TLS 1.3 **彻底删除了 CBC 模式分组加密**，全面强制要求使用带有认证标签的 AEAD（如 AES-GCM、ChaCha20-Poly1305），从根源上消除了 PKCS#7 填充攻击面。

##### 2. 抵御流量分析的隐私填充

即使攻击者无法解密报文，他们也能通过抓包分析通信数据的传输大小序列、发送时间间隔以及尺寸指纹推算出用户访问的内容：

###### ① TLS 1.3 记录层填充（Record Padding）

* TLS 1.3 将记录报文类型统一包装：明文数据首先在尾部紧贴一个真实的 `ContentType` 字节，后面可以拼接**任意数量的 `0x00` 填充字节**，最后整体送入 AEAD 加密。
* 外层记录头的类型全部固定标识为 `0x17`（Application Data）。中间窃听者既无法从外层看清这条报文是告警（Alert）、握手（Handshake）还是业务数据，更无法通过密文长度推测出明文的大致尺寸。

```text
[ TLS 1.3 待加密明文结构 ]
+-----------------------------------------------------------+
| 真实业务数据 (Payload) | ContentType (1B) | 填充 0x00 ... 0x00 |
+-----------------------------------------------------------+
                            |
                            v  (送入 AEAD 认证加密)
+-----------------------------------------------------------+
| 外层类型 (0x17) | 协议版本 (0x0303) | 密文长度 | 加密密文数据 (含Tag) |
+-----------------------------------------------------------+

```

###### ② ECH 报文填充（防止真实域名长度推算）

* 在加密客户端问候（ECH）中，内层的 `ClientHelloInner` 装载了真实的受保护域名。
* 如果访问 `a.com` 生成的加密载荷是 300 字节，而访问 `internal-confidential-service.bank.com` 生成的载荷是 340 字节，中间审查设备就能利用密文大小推测出访问的目标站类型。
* 因此 ECH 规范强制要求：在 `ClientHelloInner` 中插入指定长度的 `Padding` 扩展，将所有内层报文的总体尺寸标准化为固定的台阶步长（如对齐到 128 字节或最大可能长度），彻底消除尺寸指纹。

###### ③ HTTP/2 与 HTTP/3 帧级填充

* `DATA` 帧和 `HEADERS` 帧均包含 `PADDED` 标志位。
* 通过在数据帧尾部追加伪随机填充字节，阻断安全界知名的“CRIME / BREACH 攻击”变体，防止旁路监听者根据 HTTP 动态压缩算法（HPACK/QPACK）压缩后的报文大小逆推敏感 Cookie 或 Token。

### 被动流量分析、DPI 与主动探测



### 流量特征与指纹