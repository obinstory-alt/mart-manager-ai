
export interface Mart {
  id: number;
  name: string;
}

export interface InventoryItem {
  id: number;
  martId: number;
  name: string;
  price: number;
  unit: string;
  isPinned: boolean;
  date: string;
}

export interface AnalysisResult {
  name: string;
  price: number;
  unit: string;
}

export enum Tab {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  SETTINGS = 'settings'
}
