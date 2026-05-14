# StockGoose

<p align="center">
  <img width="100" alt="StockGoose logo" src="public/logo.svg">
</p>
<p align="center"><strong>StockGoose</strong> - 极简自选股实时监控面板</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/State-Zustand-orange" />
  <img src="https://img.shields.io/badge/Tauri-2.x-67D9F2?logo=tauri&logoColor=white" />
</p>

StockGoose 是一个纯前端自选股行情面板。浏览器直接连接公开行情源，无后端、无账号、无数据中转；自选、提醒和偏好都保存在本地。

> 体验站点：[StockGoose](https://stockgoose.pages.dev/)

## 特性

- 自选股管理：添加、删除、排序、筛选、卡片/列表视图
- 实时行情：价格、涨跌幅、分时走势、历史走势
- 价格提醒：浏览器端规则判断，支持系统通知和站内提示
- 桌面应用：Tauri v2 原生打包，系统托盘后台运行，原生系统通知
- 本地优先：用户数据导入导出，不上传自选或提醒配置
- 轻量体验：纯静态部署，前端直连数据源，少依赖、低维护

## 技术栈

Next.js 16 / React 19 / TypeScript / Tailwind CSS / shadcn/ui / Zustand / Tauri v2

## 快速开始

```bash
npm install
npm run dev
```

开发地址：`http://localhost:3000`

常用命令：

```bash
npm run build
npm run lint
npm run typecheck
```

## 桌面端 (Tauri)

需要先安装 [Rust](https://rustup.rs/)。

```bash
npm run tauri:dev     # 开发模式（自动启动 Next.js + Tauri 窗口）
npm run build         # 先构建前端静态文件
npm run tauri:build   # 打包为桌面安装包
```

> `npm run tauri:dev` 同时启动 Next.js dev server (端口 3000) 和 Tauri 原生窗口，支持热更新。

安装包输出目录：`src-tauri/target/release/bundle/`

## 部署（Web）

```bash
npm run build
```

静态输出目录：`out`

## 数据来源

本项目使用浏览器直连以下公开接口：

| 数据类型      | 接口地址                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| 股票/基金搜索 | `https://base.itab.link/stock/search?name={q}`                                  |
| 实时行情      | `https://qt.gtimg.cn/q={code1},{code2}...`                                      |
| 分时趋势      | `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid={market.code}`      |
| 历史 K 线     | `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={market.code}`     |
| 历史 K 线回退 | `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,{n},qfq` |

> 免责声明：以上接口均为第三方公开接口，随时可能变动或失效。本项目仅供学习交流，不构成投资建议。

## 后续方向

- [ ] 考虑接入 stock-sdk 库，尝试 PR 完善
- [ ] 接入桌面端/移动端原生提醒适配器
