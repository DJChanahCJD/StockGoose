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

StockGoose 是一个基于 Next.js 静态导出和 Cloudflare Pages Functions 的自选股行情面板，用于本地维护自选标的、查看行情走势并配置浏览器端价格提醒。

## 功能

- 自选标的管理（添加、右键/长按菜单、拖拽排序、删除确认）
- 实时行情展示（价格、涨跌幅、走势图）、价格提醒规则
- 标的详情外链（东方财富、雪球、同花顺、新浪财经）
- 日夜模式、涨跌颜色切换、市场筛选、网格/列表视图
- 用户数据导入导出

## 技术栈

| 层       | 技术                               |
| -------- | ---------------------------------- |
| 前端     | Next.js 16 (App Router) + React 19 |
| 样式     | Tailwind CSS v4 + shadcn/ui        |
| 状态     | Zustand + persist                  |
| 后端     | Cloudflare Pages Functions + Hono  |
| 共享类型 | TypeScript workspace               |

## 快速开始

```bash
npm install
npm run build
npm run dev
```

- 前端：`http://localhost:3000`
- 后端 Functions：`http://localhost:8788`

`npm run dev` 会同时启动 Next.js 开发服务器和 `wrangler pages dev frontend/out`。首次启动前需要先执行 `npm run build` 生成 `frontend/out`。

常用命令：

```bash
npm run lint
npm run typecheck
```

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
├── functions/         # Cloudflare Pages Functions 后端 (Hono)
│   ├── routes/        # /stocks 与 /proxy API
│   ├── middleware/    # CORS 中间件
│   └── utils/         # 代理、缓存与响应工具
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

## 后续方向

- [ ] 支持编辑持仓数量和盈亏分析功能
- [ ] 做成浏览器插件，降低跨域和 IP 限制影响
- [ ] 接入桌面端/移动端原生提醒适配器
