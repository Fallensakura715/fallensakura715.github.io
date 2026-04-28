---
title: test
date: 2026-04-28 17:14:24
tags:
---
# Markdown 样式完全展示

> 本文档涵盖 Claude 网页端能够渲染的所有 Markdown 样式元素。

---

## 一、标题层级

# H1 一级标题

## H2 二级标题

### H3 三级标题

#### H4 四级标题

##### H5 五级标题

###### H6 六级标题

---

## 二、文本样式

普通文本正文段落，这是一段普通的文字内容。

**粗体文本（Bold）**

_斜体文本（Italic）_

_**粗斜体文本（Bold + Italic）**_

~~删除线文本（Strikethrough）~~

`行内代码（Inline Code）`

<kbd>Ctrl</kbd> + <kbd>C</kbd>（键盘按键样式）

---

## 三、引用块

> 这是一级引用块。 
> 可以跨越多行。

> 一级引用
> 
> > 二级嵌套引用
> > 
> > > 三级嵌套引用

---

## 四、列表

### 无序列表

- 项目一
- 项目二
    - 嵌套项目 A
    - 嵌套项目 B
        - 深层嵌套
- 项目三

### 有序列表

1. 第一步
2. 第二步
    1. 子步骤 2.1
    2. 子步骤 2.2
3. 第三步

### 任务列表（Task List）

- [x]  已完成的任务
- [x]  另一个已完成任务
- [ ]  未完成的任务
- [ ]  待办事项

---

## 五、代码块

无语言标注：

```
这是没有语言标注的代码块
function hello() { return "world" }
```

JavaScript：

javascript

```javascript
const greet = (name) => `Hello, ${name}!`;
console.log(greet("Claude"));
```

Python：

python

```python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
```

Bash：

bash

```bash
#!/bin/bash
docker compose up -d && echo "Done!"
```

JSON：

json

```json
{
  "name": "aeonfuyu",
  "version": "1.0.0",
  "active": true
}
```

YAML：

yaml

```yaml
server:
  port: 8080
database:
  url: jdbc:mysql://localhost:3306/mall
```

SQL：

sql

```sql
SELECT u.username, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id
ORDER BY order_count DESC;
```

Diff：

diff

```diff
- 这行被删除了
+ 这行被添加了
  这行没有变化
```

---

## 六、表格

### 基础表格

|列 A|列 B|列 C|
|---|---|---|
|单元格 1|单元格 2|单元格 3|
|单元格 4|单元格 5|单元格 6|

### 对齐方式

| 左对齐         | 居中对齐          | 右对齐         |
| ----------- | ------------- | ----------- |
| Spring Boot | MyBatis-Plus  | 3.5.0       |
| Redis       | Elasticsearch | 1,024 nodes |

### 含格式的表格

|工具|类型|状态|
|---|---|---|
|`sing-box`|代理客户端|✅ 已配置|
|`RAGFlow`|RAG 框架|🔧 调试中|
|`Open WebUI`|LLM 前端|✅ 已部署|
|~~NapCat~~|QQ Bot|❌ OOM 崩溃|

---

## 七、链接与图片

[Anthropic 官网](https://www.anthropic.com)

[带有 title 的链接](https://claude.ai "Claude AI 助手")

自动识别：[https://docs.anthropic.com](https://docs.anthropic.com)

Show Image

---

## 八、分割线

---

---

---

---

## 九、数学公式（LaTeX）

### 行内公式
 
爱因斯坦质能方程：$E = mc^2$
 
勾股定理：$a^2 + b^2 = c^2$
 
### 块级公式
 
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
 
$$
\frac{\partial f}{\partial x} = \lim_{\Delta x \to 0} \frac{f(x + \Delta x) - f(x)}{\Delta x}
$$
 
$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$
 
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

---

## 十、脚注

这里有一个脚注引用[1](#user-content-fn-1)，还有另一个[2](#user-content-fn-2)。

---

## 十一、HTML 内嵌

<details> <summary>点击展开折叠内容 ▶</summary>

这是折叠区域内的内容，支持嵌套 Markdown：

- 列表项 1
- 列表项 2

python

```python
print("折叠区域内的代码块")
```

</details> <br>

<mark>高亮文本（HTML mark 标签）</mark>

上标：X<sup>2</sup>，下标：H<sub>2</sub>O，按键：<kbd>Enter</kbd>

---

## 十二、Emoji

🏔️ 山岳 | 🏃 跑步 | 🎵 音乐 | 💻 编程 | ☁️ 云服务

✅ ❌ ⚠️ 🔧 🚀 📦 🔍 💡 🎯 📌 🗂️ 🔐 🌐 📊 🧪

---

## 十三、综合嵌套

> **提示：** 引用块内嵌套列表和代码块。
> 
> 1. 安装依赖
>     
>     bash
>     
>     ```bash
>     pip install ragflow-sdk
>     ```
>     
> 2. 初始化客户端
>     
>     python
>     
>     ```python
>     client = RAGFlow(api_key="YOUR_KEY")
>     ```
>     
> 3. 支持的参数：
>     - `similarity_threshold` — 相似度阈值
>     - `top_k` — 返回数量上限

---

_文档结束 · 由 Claude 生成 · aeonfuyu_

## Footnotes

1. 这是第一个脚注的内容。 [↩](#user-content-fnref-1)
    
2. 这是第二个脚注，可以包含 **粗体** 和 `代码`。 [↩](#user-content-fnref-2)