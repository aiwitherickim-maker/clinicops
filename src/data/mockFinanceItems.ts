export interface FinanceItem {
  id: string;
  vendor: string;
  amount: string;
  card: string;
  date: string;
  category: string | null;
  status: 'categorized' | 'needs_review' | 'pending';
}

export const FINANCE_ITEMS: FinanceItem[] = [
  {
    id: 'fi-1',
    vendor: 'Medical Supply Co.',
    amount: '$482.90',
    card: 'Clinic Visa · ••3104',
    date: 'Yesterday',
    category: null,
    status: 'needs_review',
  },
  {
    id: 'fi-2',
    vendor: 'Office Depot',
    amount: '$67.14',
    card: 'Clinic Visa · ••3104',
    date: 'May 11',
    category: 'Office supplies',
    status: 'categorized',
  },
  {
    id: 'fi-3',
    vendor: 'Medline Industries',
    amount: '$1,240.00',
    card: 'Clinic Visa · ••3104',
    date: 'May 10',
    category: 'Medical supplies',
    status: 'categorized',
  },
  {
    id: 'fi-4',
    vendor: 'AT&T Business',
    amount: '$189.99',
    card: 'Clinic Visa · ••3104',
    date: 'May 9',
    category: 'Utilities / telecom',
    status: 'categorized',
  },
  {
    id: 'fi-5',
    vendor: 'Allergan Inc.',
    amount: '$3,420.00',
    card: 'Clinic Visa · ••3104',
    date: 'May 8',
    category: null,
    status: 'pending',
  },
];
