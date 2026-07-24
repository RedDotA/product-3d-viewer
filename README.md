# 产品 3D 网页查看器

面向电脑和手机浏览器的产品模型查看器。支持触控/鼠标旋转、缩放、平移、自动旋转、重置视角、背景切换和全屏。

当前推荐使用免费的 GitHub Pages 公开模式。项目仍保留限时令牌服务端，后续需要保密时可以继续使用。

## 一、给不同客户添加模型

1. 在 SolidWorks 中建立展示专用配置，建议先使用 Defeature 移除不需要展示的结构。
2. 经 Visualize 或其他内部转换工具导出单文件 `.glb`，贴图应嵌入 GLB。
3. 运行添加命令：

```bash
npm run add-model -- \
  --file "/模型所在路径/model.glb" \
  --name "产品 A" \
  --client "客户公司 A"
```

命令会验证 GLB、复制到 `public/models/`、更新 `public/models.json`，并输出类似链接：

```text
https://reddota.github.io/product-3d-viewer/?model=share-a82f91c0
```

4. 提交并发布：

```bash
git add public
git commit -m "Add customer model"
git push
```

每个模型拥有独立分享 ID，无需覆盖 `product.glb`。需要自定义 ID、水印或设为默认模型时，查看：

```bash
npm run add-model -- --help
```

模型建议控制在 10–30 MB，GitHub 不接受超过 100 MB 的普通仓库文件。公开模式下，不同链接只用于切换模型；仓库和 GLB 仍然公开，不构成权限隔离。

## 二、本地检查

```bash
npm install
npm run build
npm run preview
```

打开 `http://127.0.0.1:4173`。测试指定模型时使用 `http://127.0.0.1:4173/?model=分享ID`。

## 三、发布到 GitHub Pages

1. 在 GitHub 创建一个 Public repository。
2. 将本项目推送到仓库的 `main` 分支。
3. 打开仓库 `Settings → Pages`。
4. 在 `Build and deployment` 的 `Source` 中选择 `GitHub Actions`。
5. 等待仓库的 `Actions` 页面中 `Deploy viewer to GitHub Pages` 变为绿色。
6. 发布后的默认地址为 `https://你的GitHub用户名.github.io/仓库名/`。

项目包含 `.github/workflows/deploy-pages.yml`，以后每次推送 `main` 都会自动重新构建和发布。

## 四、以后绑定自定义域名（可选）

需要启用 `viewer.glowingdisk.com` 时，在 `public/` 新建内容为 `viewer.glowingdisk.com` 的 `CNAME` 文件，并在域名 DNS 控制台添加：

```text
类型：CNAME
名称：viewer
目标：你的GitHub用户名.github.io
```

不要在目标地址中填写 `https://` 或仓库名。DNS 生效时间通常从几分钟到 24 小时不等。

## 五、后续恢复保密模式

私有模式继续使用：

```bash
npm run build
SHARE_SECRET="至少32位随机密钥" npm run serve
```

服务端模型放在 `models/`，通过 `npm run link` 生成限时链接。GitHub Pages 只支持公开静态模式，不能运行 `server.mjs`。
