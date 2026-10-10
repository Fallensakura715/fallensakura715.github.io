# Hugo 部署

当前仓库使用三个分支：`source` 保存旧 Hexo 源码，`hugo` 保存当前 Hugo 源码，`main` 保存生成的静态网站。

`.github/workflows/deploy.yml` 会在推送到 `hugo` 时构建网站，把 `public/` 的内容提交到 `main` 根目录，并将同一份产物部署到 GitHub Pages。发往 `hugo` 的 Pull Request 只检查构建。发布会清除 `main` 中旧的成品文件，保留提交历史，不使用强制推送。

## 首次启用

1. 提交本次部署配置，再推送当前分支：

   ```powershell
   git add .github/workflows/deploy.yml DEPLOY.md
   git commit -m "ci: build Hugo and publish main"
   git push -u origin hugo
   ```

2. 在 GitHub 仓库的 **Settings → General → Default branch** 中把默认分支改为 `hugo`。旧 `source` 分支可以保留。设为默认分支后，Actions 页面才能显示本工作流的 **Run workflow** 手动运行按钮。

3. 到 **Actions → Build and deploy Hugo** 查看运行结果。工作流使用内置 `GITHUB_TOKEN`，不需要额外添加个人令牌。更新 `main` 的任务申请 `contents: write`，Pages 部署任务申请 `pages: write` 和 `id-token: write`。如果 `main` 有保护规则，需要允许发布任务提交。

4. 在 Cloudflare Pages 项目的构建设置中使用：

   | 设置 | 值 |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | 留空 |
   | Build output directory | `/`（仓库根目录） |
   | Root directory | 默认／留空 |

   `main` 已经是构建成品，Cloudflare 不需要再执行 Hugo 或 Hexo。确认启用了 Git 自动部署，并把预览分支限制为需要的分支，避免把 Hugo 源码直接当作静态网站发布。

5. 如果 Cloudflare 没有自动开始构建，在 Pages 项目的部署页面重试最新 `main` 提交；确认首次部署成功后，日常只需推送 `hugo`。

## 后续更新

在 `hugo` 分支修改内容，提交后执行 `git push`。GitHub Actions 构建成功后自动更新 `main` 并部署 GitHub Pages，Cloudflare Pages 再发布 `main` 的这一提交。

工作流固定使用 Hugo Extended 0.166.0，并递归拉取主题子模块。修改主题配置时，应把网站配置放在根目录的 `hugo.yaml` 或 `config/`，把模板覆盖放在根目录的 `layouts/`；没有提交到主题子模块远程的修改不会出现在 CI 中。

构建使用独立的资源与缓存目录，避免复用仓库里已有的 `resources/_gen` CSS。生成的 `.nojekyll` 会一起发布。

## 域名与 GitHub Pages

`hugo.yaml` 的 `baseurl` 应与最终访问域名一致。目前配置为 `https://falnsakura.top/`；如果正式地址仍是 `https://www.falnsakura.top/`，请修改这个值，并在 Cloudflare 将另一个域名重定向到正式地址。

在仓库 **Settings → Pages → Build and deployment** 中把 Source 设为 **GitHub Actions**。`github-pages` 发布环境的允许分支必须包含 `hugo`；如果它仅允许旧 `source` 分支，需要在 **Settings → Environments → github-pages** 中添加 `hugo`。

`GITHUB_TOKEN` 推送 `main` 不会触发 GitHub Pages 的分支构建，所以本工作流使用官方 `upload-pages-artifact` 和 `deploy-pages` 直接发布。`https://fallensakura715.github.io/` 和 Cloudflare 自定义域名将使用同一份 Hugo 产物。

原 `source` 分支上的 `pages.yml` 仍然会在推送 `source` 时发布旧 Hexo 网站；完成迁移后，请停用那个旧工作流，避免再次发布旧网站。

若希望新 Hugo 源码也叫 `source`，应先备份原 `source`，再替换源码，并同时把工作流的两个分支触发条件和发布条件里的 `hugo` 改为 `source`。不必为了启用部署先覆盖旧源码分支。
