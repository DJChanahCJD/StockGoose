export type StockIdentity = {
  code: string;
  name: string;
  market: string;
  marketName: string;
  securityType?: string;
  securityTypeName?: string;
};

export type StockSearchItem = StockIdentity;

export type StockTrendPoint = {
  time: string;
  price: number;
  volume: number;
  average: number;
};

export type StockHistoryRange =
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "3y"
  | "5y"
  | "10y"
  | "all";

export type StockHistoryPoint = {
  date: string;
  close: number;
  changePercent: number;
};

export type StockQuote = StockIdentity & {
  secid: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  amount: number | null;
  updatedAt: string | null;
  trend: StockTrendPoint[];
};

export type RealtimeSnapshot = {
  secid: string;
  code: string;
  name: string;
  price: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  amount: number | null;
  turnoverRate: number | null;
  pe: number | null;
  amplitude: number | null;
  totalMarketCap: number | null;
  highLimit: number | null;
  lowLimit: number | null;
  bidPrice: number | null;
  bidVolume: number | null;
  askPrice: number | null;
  askVolume: number | null;
  updatedAt: string | null;
};

export type AlertRule = {
  id: string;
  secid: string;
  type:
    | "PRICE_ABOVE"
    | "PRICE_BELOW"
    | "CHANGE_PERCENT_ABOVE"
    | "CHANGE_PERCENT_BELOW";
  threshold: number;
};
