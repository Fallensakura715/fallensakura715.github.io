---
date: 2026-11-09T16:56:53+08:00
draft: true
title: 你的数据包长什么样？代理协议的报文结构及流量特征分析（四）
slug: packet-and-net-protocols-4
tags:
  - 抓包
  - 网络协议
  - 网络基础
categories:
  - 技术
image:
---
>[!CAUTION]
>本文仅用于网络协议科普、流量分析与技术研究。涉及的抓包、节点部署及实验，均在自有的虚拟的环境中进行。
>
>文中的报文结构、握手行为与流量特征受软件版本、配置、网络环境及抓包位置影响，实验结果仅反映所述条件下的观测，不构成对协议安全性、匿名性或抗识别能力的保证，也不能据此直接推断实际网络中的识别与封锁效果。

你有没有想过，别人拿到你数据包的时候，是怎么看你用了什么协议，访问了什么网站的？



## HTTP

## VPN 隧道协议
大约十年之前，我们口中常说的"VPN"，指的就是这些 VPN 隧道协议。
现在 GFW 对 VPN 政策是白名单制度，名单之外的 VPN 协议一律丢包。
### OpenVPN
### WireGuard

## Shadowsocks
### SS AEAD
### SS-2022 AEAD

## 基于 TLS 的协议
### Trojan
### AnyTLS

## VLESS 协议的组合
### VLESS-XTLS-Vision-Reality
### VLESS-WebSocket
### VLESS-XHTTP
### XDRIVE

## 基于 UDP 的协议
### Hysteria2
### TUIC

---

除此之外，还有基于 Chromium 内核魔改的NaïveProxy，soduku，Snell，Juicity，Mieru 等等。

## 相关链接

