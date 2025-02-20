import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';

// 导入你的 reducers
import rootReducer from '../store/rootReducer';

function render(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: rootReducer,
      preloadedState,
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// 重新导出所有的 testing-library 内容
export * from '@testing-library/react';
export { render };

// Mock 数据生成器
export const generateMockLoan = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  borrower: '0x1234...5678',
  amount: '1000',
  collateral: '100',
  interestRate: '0.05',
  duration: 30,
  status: 'active',
  createdAt: new Date().toISOString(),
  ...overrides
});

export const generateMockUser = (overrides = {}) => ({
  address: '0x1234...5678',
  balance: '1000',
  loans: [],
  groups: [],
  reputation: 100,
  ...overrides
});

// Mock API 响应
export const mockApiResponse = (data: any) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  });
};

// Mock 错误响应
export const mockApiError = (status: number, message: string) => {
  return Promise.reject({
    status,
    message
  });
};

// 等待元素加载
export const waitForElement = async (
  getElement: () => HTMLElement | null,
  timeout = 2000
) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = getElement();
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Element not found');
};

// Mock Web3 Provider
export const mockWeb3Provider = {
  on: jest.fn(),
  removeListener: jest.fn(),
  request: jest.fn(),
  selectedAddress: '0x1234...5678',
  networkVersion: '1',
  isConnected: jest.fn(() => true)
};

// Mock Merkle Service
export const mockMerkleService = {
  getPrices: jest.fn(),
  subscribeToPrice: jest.fn(),
  unsubscribeFromPrice: jest.fn(),
  executeMarketOrder: jest.fn()
};

// Mock Move Agent
export const mockMoveAgent = {
  deployContract: jest.fn(),
  executeTransaction: jest.fn(),
  queryState: jest.fn()
};

// 创建一个模拟的 localStorage
export class MockLocalStorage {
  private store: { [key: string]: string } = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

// Mock WebSocket
export class MockWebSocket {
  private listeners: { [key: string]: Function[] } = {};

  constructor(url: string) {}

  send(data: string) {}

  close() {}

  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // 触发事件的方法
  triggerEvent(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// 创建模拟事件
export const createMockEvent = (type: string, props = {}) => {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    type,
    ...props
  };
};

// 模拟 Fetch 请求
export const mockFetch = (data: any) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data)
    })
  );
};
