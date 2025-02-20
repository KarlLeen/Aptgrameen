import { MerkleService } from '../MerkleService';
import { mockWebSocket } from '../../../test/test-utils';

jest.mock('websocket', () => ({
  w3cwebsocket: mockWebSocket
}));

describe('MerkleService', () => {
  let merkleService: MerkleService;

  beforeEach(() => {
    merkleService = MerkleService.getInstance({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      wsUrl: 'wss://test.merkle.io',
      restUrl: 'https://test.merkle.io'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('price subscription', () => {
    it('should subscribe to price updates', () => {
      const callback = jest.fn();
      merkleService.subscribeToPriceUpdates('APT/USD', callback);

      // 模拟接收价格更新
      const priceUpdate = {
        pair: 'APT/USD',
        price: '100.50',
        timestamp: Date.now()
      };

      // 触发 WebSocket 消息
      (global as any).mockWebSocket.triggerEvent('message', {
        data: JSON.stringify(priceUpdate)
      });

      expect(callback).toHaveBeenCalledWith(priceUpdate);
    });

    it('should handle connection errors', () => {
      const errorSpy = jest.spyOn(console, 'error');
      
      // 触发 WebSocket 错误
      (global as any).mockWebSocket.triggerEvent('error', new Error('Connection failed'));

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('market order execution', () => {
    it('should execute market orders successfully', async () => {
      const order = {
        symbol: 'APT/USD',
        side: 'buy',
        amount: '100',
        price: '10.5'
      };

      const mockResponse = {
        orderId: '123',
        status: 'filled',
        filledAmount: '100',
        averagePrice: '10.5'
      };

      global.fetch = jest.fn().mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })
      );

      const result = await merkleService.executeMarketOrder(order);
      expect(result).toEqual(mockResponse);
    });

    it('should handle order execution errors', async () => {
      const order = {
        symbol: 'APT/USD',
        side: 'buy',
        amount: '100',
        price: '10.5'
      };

      global.fetch = jest.fn().mockImplementationOnce(() =>
        Promise.reject(new Error('Order failed'))
      );

      await expect(merkleService.executeMarketOrder(order))
        .rejects
        .toThrow('Order failed');
    });
  });

  describe('risk assessment', () => {
    it('should calculate risk metrics correctly', () => {
      const collateral = '1000';
      const loanAmount = '500';
      const price = '10';

      const risk = merkleService.calculateRiskMetrics({
        collateral,
        loanAmount,
        price
      });

      expect(risk.collateralRatio).toBe(20); // (1000 * 10) / 500
      expect(risk.liquidationPrice).toBe(5);  // (500 * 1.1) / 1000
    });

    it('should handle invalid input for risk calculation', () => {
      expect(() => {
        merkleService.calculateRiskMetrics({
          collateral: '0',
          loanAmount: '500',
          price: '10'
        });
      }).toThrow('Invalid collateral amount');
    });
  });

  describe('singleton pattern', () => {
    it('should maintain single instance', () => {
      const instance1 = MerkleService.getInstance({
        apiKey: 'key1',
        apiSecret: 'secret1',
        wsUrl: 'ws1',
        restUrl: 'rest1'
      });

      const instance2 = MerkleService.getInstance({
        apiKey: 'key2',
        apiSecret: 'secret2',
        wsUrl: 'ws2',
        restUrl: 'rest2'
      });

      expect(instance1).toBe(instance2);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources properly', () => {
      const callback = jest.fn();
      merkleService.subscribeToPriceUpdates('APT/USD', callback);
      merkleService.destroy();

      // 触发价格更新，不应该调用回调
      (global as any).mockWebSocket.triggerEvent('message', {
        data: JSON.stringify({ price: '100' })
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
