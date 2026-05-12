# 行情数据源说明

StockGoose 是纯前端应用，浏览器直接请求公开行情接口。项目不提供内部后端 API，也不再通过 Cloudflare Functions 中转。

## 搜索

```text
https://base.itab.link/stock/search?lang=cn&name={query}
```

当前实现读取 `data[]`，并归一化为本地 `StockSearchItem`。

## 分时趋势

```text
https://push2.eastmoney.com/api/qt/stock/trends2/get
```

主要参数：

```text
secid={market.code}
fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13
fields2=f51,f53,f56,f58
iscr=0
iscca=0
ndays=1
```

当前实现使用 `data.trends[]` 生成价格、涨跌幅和迷你走势图。

## 历史 K 线

优先使用东方财富：

```text
https://push2his.eastmoney.com/api/qt/stock/kline/get
```

主要参数：

```text
secid={market.code}
fields1=f1,f2,f3,f4,f5,f6
fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61
klt=101
fqt=1
end=20500101
lmt={rangeLimit}
```

失败时前端直接回退腾讯财经：

```text
https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={qtCode},day,,,{rangeLimit},qfq
```

`qtCode` 示例：

```text
0.000858 -> sz000858
1.600519 -> sh600519
116.00700 -> hk00700
106.AAPL -> usAAPL.OQ
```

## 实时快照

```text
https://qt.gtimg.cn/q={qtCode1},{qtCode2}
```

返回内容是 GBK 编码字符串。当前实现使用浏览器 `TextDecoder("gbk")` 解码，并解析 `~` 分隔字段。

## 风险

- 以上均为第三方公开接口，没有稳定 SLA。
- 若任一源站调整 CORS、字段或编码，前端直连可能失效。
- 历史 K 线已经有东方财富到腾讯财经的前端回退；其他接口暂不增加额外数据源。
