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

- 自选股管理（添加、右键/长按菜单、拖拽排序、删除确认）
- 实时行情展示（价格、涨跌幅、走势图）
- 价格提醒规则
- 自适应涨跌颜色（US 绿涨红跌 / CN 红涨绿跌）
- 暗色模式
- 行情数据自动刷新

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

> 开发环境密码为 `123456`（访问 `/admin` 时需要）。

## 部署

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 构建命令：`npm run build`，输出目录：`frontend/out`
3. 设置环境变量 `PASSWORD`
4. 创建 D1 数据库并绑定到 Pages 项目（变量名 `DB`）
5. 重新部署

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

## TODO

- [ ] 评估 API 稳定性，如何避免限流
- [x] 支持拖拽管理标的卡片
- [x] 支持筛选功能、列表模式(参考小米负一屏的股票widget卡片)
- [x] 实现 Web 端规则提醒调度器与通知适配器
- [ ] 接入 Tauri 桌面端/移动端原生提醒适配器
- [x] 提供历史涨跌幅浏览功能，hover 时显示日期、累计涨跌幅和收盘价
- [ ] 评估是否应该接入 KV 存储
