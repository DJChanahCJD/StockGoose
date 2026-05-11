# StockGoose

<p align="center">
  <img width="100" alt="StockGoose logo" src="frontend/public/logo.svg">
</p>
<p align="center"><strong>StockGoose</strong> — 自选股实时行情监控面板</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Hono-4.x-000000?logo=hono&logoColor=white" />
  <img src="https://img.shields.io/badge/State-Zustand-orange" />
</p>

## 功能

- 自选标的管理（添加、右键/长按菜单、拖拽排序、删除确认）
- 实时行情展示（价格、涨跌幅、走势图）、价格提醒规则
- 日夜模式 / 涨跌颜色切换 / 网格视图 / 列表视图
- 数据导入导出

## 技术栈

| 层     | 技术                               |
| ------ | ---------------------------------- |
| 前端   | Next.js 16 (App Router) + React 19 |
| 样式   | Tailwind CSS v4 + shadcn/ui        |
| 状态   | Zustand + persist                  |
| 后端   | Cloudflare Pages Functions (Hono)  |
| 数据库 | Cloudflare D1                      |
| 桌面   | Tauri (可选)                       |

## 快速开始

```bash
npm install
npm run dev
```

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8788` (由 Wrangler 代理)

> 后端当前仅负责代理 Web 端 API 请求

## 部署

1. 在 Cloudflare Dashboard 创建 **Pages** 项目
2. 构建命令：`npm run build`，输出目录：`frontend/out`
3. 点击部署

> 注意：不要部署成 Workers 项目

## 项目结构

```
├── frontend/          # Next.js 前端
│   ├── app/           # 页面与布局
│   ├── components/    # UI 与业务组件
│   ├── lib/           # 工具函数与 API 客户端
│   └── stores/        # Zustand 状态管理
├── functions/         # Cloudflare Functions 后端 (Hono)
│   ├── routes/        # API 路由
│   ├── middleware/     # 中间件 (Auth, CORS)
│   └── utils/         # 后端工具函数
├── shared/            # 前后端共享类型
└── .husky/            # Git hooks（typecheck + lint-staged）
```

## 数据来源

本项目使用了以下 API 接口：

| 数据类型      | 接口地址                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| 股票/基金搜索 | `https://base.itab.link/stock/search?name={q}`                              |
| 实时行情      | `http://qt.gtimg.cn/q={code1},{code2}...`                                   |
| 分时趋势      | `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid={market.code}`  |
| 历史 K 线     | `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={market.code}` |

> ⚠️ 免责声明：以上接口均为第三方接口，随时可能变动或失效。本项目仅供学习交流，不构成投资建议。

## TODO

- [x] 支持拖拽管理标的卡片
- [x] 支持筛选功能、列表模式(参考小米负一屏的股票widget卡片)
- [x] 实现 Web 端规则提醒调度器与通知适配器
- [x] 提供历史涨跌幅浏览功能，hover 时显示日期、累计涨跌幅和收盘价
- [x] 支持数据导入导出，方便迁移或备份

### Low Priority

- [ ] 清理冗余后端代码
- [ ] 接入 Tauri 桌面端/移动端原生提醒适配器
- [ ] 评估是否应该接入 KV 存储
