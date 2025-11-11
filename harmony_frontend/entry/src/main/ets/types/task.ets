export interface Task {
  id: string;
  title: string;
  category: string;
  DDL: string;
  position: string;
  address: string;
  takeCode?: string;
  takeName?: string;
  takeTel?: string | number;
  detail: string;
  offer: number | string;
  pay_amount?: number | string;
  status: number;
  mode?: 'fixed' | 'bidding';
  has_paid?: number;
  formattedDDL?: string;
  formattedStatus?: string;
  displayPrice?: string;
  priceState?: 'fixed' | 'processing' | 'bidding' | 'deal' | 'finished';
}
