---
title: Hello World
---
Welcome to fallensakura715's first post.
---


## 获取 github 用户 contributions 记录

### 基本信息

URL:          https://github-contrib.falnsakura.top/
Method:    GET
### 请求参数

**Query**

| 参数名  | 类型     | 必填  | 说明         |
| ---- | ------ | --- | ---------- |
| user | string | 是   | GitHub 用户名 |
```bash
GET https://github-contrib.falnsakura.top/?user={USERNAME}
```

```bash
curl "https://github-contrib.falnsakura.top/?user={USERNAME}"
```

下面给你 **完整的 Mermaid 流程图代码**，分为：

- **主流程 main()**
    
- **input()**
    
- **sort()**
    
- **running()**
    

你可以直接复制到 Markdown 文件或 VSCode + Mermaid 插件里即可看到图像。

---

# 🌟 **1. 主流程 main() — Mermaid**

```mermaid
graph TB
    subgraph FirstFit["首次适应算法 (First Fit)"]
        FF1([开始]) --> FF2[temp = head<br/>遍历链表]
        FF2 --> FF3{找到空闲块?<br/>status == -1<br/>且 size >= 需求}
        FF3 -->|否| FF4[temp = temp->next]
        FF4 --> FF5{temp == NULL?}
        FF5 -->|否| FF3
        FF5 -->|是| FF6[返回0<br/>分配失败]
        FF3 -->|是| FF7{块大小 == 需求?}
        FF7 -->|是| FF8[直接分配<br/>status = pid]
        FF7 -->|否| FF9[分割块<br/>剩余部分创建新节点]
        FF9 --> FF10[新节点插入链表<br/>status = -1]
        FF8 --> FF11[返回1<br/>分配成功]
        FF10 --> FF11
    end
```
```mermaid
graph TB
    subgraph BestFit["最佳适应算法 (Best Fit)"]
        BF1([开始]) --> BF2[temp = head<br/>p = NULL<br/>遍历所有节点]
        BF2 --> BF3{当前节点空闲?<br/>status == -1<br/>且 size >= 需求}
        BF3 -->|否| BF4[temp = temp->next]
        BF3 -->|是| BF5{p == NULL?}
        BF5 -->|是| BF6[p = temp<br/>记录第一个合适块]
        BF5 -->|否| BF7{temp->size < p->size?}
        BF7 -->|是| BF8[p = temp<br/>更新最佳块]
        BF7 -->|否| BF4
        BF6 --> BF4
        BF8 --> BF4
        BF4 --> BF9{遍历完成?}
        BF9 -->|否| BF3
        BF9 -->|是| BF10{找到合适块?<br/>p != NULL}
        BF10 -->|否| BF11[返回0<br/>分配失败]
        BF10 -->|是| BF12{剩余空间 > 0?}
        BF12 -->|是| BF13[分割块<br/>创建新空闲节点]
        BF12 -->|否| BF14[直接分配]
        BF13 --> BF15[返回1<br/>分配成功]
        BF14 --> BF15
    end
```
```mermaid
graph TB
    subgraph WorstFit["最坏适应算法 (Worst Fit)"]
        WF1([开始]) --> WF2[temp = head<br/>p = NULL<br/>遍历所有节点]
        WF2 --> WF3{当前节点空闲?<br/>status == -1<br/>且 size >= 需求}
        WF3 -->|否| WF4[temp = temp->next]
        WF3 -->|是| WF5{p == NULL?}
        WF5 -->|是| WF6[p = temp<br/>记录第一个合适块]
        WF5 -->|否| WF7{temp->size > p->size?}
        WF7 -->|是| WF8[p = temp<br/>更新最大块]
        WF7 -->|否| WF4
        WF6 --> WF4
        WF8 --> WF4
        WF4 --> WF9{遍历完成?}
        WF9 -->|否| WF3
        WF9 -->|是| WF10{块大小 > 需求?}
        WF10 -->|是| WF11[分割块<br/>剩余部分状态=-1]
        WF10 -->|否| WF12{块大小 == 需求?}
        WF12 -->|是| WF13[直接分配<br/>status = pid]
        WF12 -->|否| WF14[无法分配]
        WF11 --> WF15([完成])
        WF13 --> WF15
    end
```

```mermaid
graph TB
    subgraph Coalesce["合并算法 (Coalesce)"]
        C1([开始]) --> C2[temp = head]
        C2 --> C3{temp != NULL?}
        C3 -->|否| C4([结束])
        C3 -->|是| C5{temp->status == -1?<br/>当前块空闲?}
        C5 -->|否| C6[temp = temp->next<br/>跳过已分配块]
        C5 -->|是| C7[temp1 = temp->next]
        C7 --> C8{temp1 != NULL<br/>且 temp1空闲?}
        C8 -->|是| C9[合并两块<br/>temp->size += temp1->size<br/>temp->next = temp1->next]
        C9 --> C10[temp1 = temp->next<br/>继续检查下一块]
        C10 --> C8
        C8 -->|否| C11[temp = temp1<br/>移动到下一个不同状态块]
        C6 --> C3
        C11 --> C3
    end
```
```mermaid
graph TB
	subgraph Dealloc["释放算法 (Deallocate)"]
        D1([开始]) --> D2[temp = head<br/>flag = 0]
        D2 --> D3{temp != NULL?}
        D3 -->|是| D4{temp->status == pid?}
        D4 -->|是| D5[temp->status = -1<br/>flag = 1<br/>标记为空闲]
        D4 -->|否| D6[temp = temp->next]
        D5 --> D3
        D6 --> D3
        D3 -->|否| D7{flag == 0?}
        D7 -->|是| D8[输出:未找到该进程]
        D7 -->|否| D9([完成])
        D8 --> D9
    end
```

---

# 🌟 **3. sort() — 按优先级插入单链表**

```mermaid
graph TB
	subgraph Dealloc["释放算法 (Deallocate)"]
	    SortStart --> CheckHead
	    CheckHead --> InsertHead
	    CheckHead --> ScanList
	    ScanList --> InsertTail
	    ScanList --> ComparePriority
	    ComparePriority --> InsertMiddle
	    ComparePriority --> MoveNext
	    MoveNext --> ScanList
	
	    CheckHead{Insert at head?}
	    ScanList{second != NULL}
	    ComparePriority{p.super > second.super}

```

---

# 🌟 **4. running() — 执行一次调度**

```mermaid
flowchart TD
    RunStart --> IncRuntime
    IncRuntime --> CheckFinish
    CheckFinish --> Destroy
    CheckFinish --> LowerPriority
    LowerPriority --> SetWaiting
    SetWaiting --> Reinsert
    Reinsert --> EndRun

    CheckFinish{p.rtime == p.ntime}

```