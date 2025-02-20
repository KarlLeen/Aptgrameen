// 增加测试超时时间
jest.setTimeout(30000);

// 禁用控制台警告
console.warn = jest.fn();

// 模拟全局 fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        ok: true
    })
);
