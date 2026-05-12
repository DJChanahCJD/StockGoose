# StockGoose

<p align="center">
  <img width="100" alt="StockGoose logo" src="public/logo.svg">
</p>
<p align="center"><strong>StockGoose</strong> - 自选股实时行情监控面板</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/State-Zustand-orange" />
</p>

StockGoose 是一个纯前端自选股行情面板，用于本地维护自选标的、查看行情走势并配置浏览器端价格提醒。行情数据由浏览器直连公开数据源，不经过项目后端。

## 功能

- 自选标的管理（添加、右键/长按菜单、拖拽排序、删除确认）
- 实时行情展示（价格、涨跌幅、走势图）、价格提醒规则
- 标的详情外链（东方财富、雪球、同花顺、新浪财经）
- 日夜模式、涨跌颜色切换、市场筛选、网格/列表视图
- 用户数据导入导出

## 技术栈

| 层   | 技术                               |
| ---- | ---------------------------------- |
| 前端 | Next.js 16 (App Router) + React 19 |
| 样式 | Tailwind CSS v4 + shadcn/ui        |
| 状态 | Zustand + persist                  |
| 类型 | TypeScript                         |

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

## 部署

构建命令：

```bash
npm run build
```

静态输出目录：`out`

## 项目结构

```text
├── app/             # 页面与布局
├── components/      # UI 与业务组件
├── hooks/           # React hooks
├── lib/             # 行情直连、提醒、存储与工具函数
├── public/          # 静态资源
├── stores/          # Zustand 状态管理
└── .husky/          # Git hooks
```

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
