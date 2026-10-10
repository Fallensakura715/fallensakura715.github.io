# 图片压缩配置

目前使用“旧图片保留已有 WebP，新图片上传前自行压缩”的方式。

`hugo.yaml` 中的总开关：

```yaml
params:
    imageProcessing:
        enabled: false
```

- `false`：新图片直接使用文章里的地址，不在构建时下载图床图片或转码。用 PicGo 压缩后上传，再照常写 Markdown 图片或 `image` 短代码。
- `true`：为没有保存过的图片下载原图并生成多尺寸 WebP。正文和封面的处理仍受 `content.enabled`、`thumbnail.enabled` 控制。

旧图片的 547 个 WebP 版本已上传到 R2 图床，地址沿用 PicGo 的 `PicGo/2026/10/<文件内容哈希>.webp` 规则，约 48 MB。
原图地址与各个 WebP 尺寸的对应关系保存在 `data/image_cache.json`。文章正文、封面和缩略图从图床加载这些版本。
它们不依赖 `.cache/`，关闭总开关后依然复用，不会重新编码。项目已移除 `static/media/images/`，发布时保留映射清单即可。
文章里的旧图片地址无需改动；Markdown 图片点击查看大图仍使用原图地址。
这次上传保留了已有 WebP 的文件内容，没有再次压缩。图床文件设置了一年的缓存期限，后续替换请使用新地址。

新图片的用法：

```markdown
![照片说明](https://你的图床/photo.webp)
```

```text
{{< image src="https://你的图床/photo.webp" width="85%" alt="照片说明" >}}
```

新图片和新封面直接加载上传的文件，Hugo 不会再生成缩略版。关闭构建处理时，未保存尺寸的新远程 Markdown 图片也不会启用主题的灯箱布局。
替换旧图片时请使用新文件名或新 URL，避免旧地址继续命中保存的 WebP。
直接写 HTML `<img>` 的图片不经过这套处理；GIF 和 SVG 也保持原格式。
该开关不改变视频。现有 9 个压缩视频和 9 张 WebP 封面已迁移到同一个 R2 图床，本地视频文件已移除。后续视频先压缩再上传，文章引用方式见 [视频使用说明](videos.md)。
