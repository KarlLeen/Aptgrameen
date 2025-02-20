import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { configure } from '@testing-library/react';
import { TestUtils } from '../utils/testUtils';

// 设置全局变量
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// 配置测试库
configure({
    testIdAttribute: 'data-testid',
});

// 模拟 localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// 模拟 WebSocket
class WebSocketMock {
    onopen: ((this: WebSocket, ev: Event) => any) | null = null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
    onerror: ((this: WebSocket, ev: Event) => any) | null = null;

    constructor(url: string) {
        setTimeout(() => {
            if (this.onopen) this.onopen(new Event('open'));
        }, 100);
    }

    send(data: string) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
                data: JSON.stringify({ type: 'mock_response', data })
            }));
        }
    }

    close() {
        if (this.onclose) {
            this.onclose(new CloseEvent('close'));
        }
    }
}
global.WebSocket = WebSocketMock as any;

// 初始化测试工具
beforeAll(async () => {
    TestUtils.initialize();
});

// 清理测试环境
afterAll(async () => {
    await TestUtils.cleanupTestEnvironment();
});
