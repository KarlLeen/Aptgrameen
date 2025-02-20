import { AptosClient, Types, HexString } from 'aptos';
import { WalletService } from '../wallet/walletService';
import { EventTracker } from '../analytics/EventTracker';

interface HedgeContractConfig {
    moduleAddress: string;
    nodeUrl: string;
    contractName: string;
}

interface HedgePosition {
    positionId: string;
    amount: number;
    openPrice: number;
    hedgeRatio: number;
    timestamp: number;
    status: 'open' | 'closed';
}

export class HedgeContractService {
    private static instance: HedgeContractService;
    private client: AptosClient;
    private walletService: WalletService;
    private eventTracker: EventTracker;
    private moduleAddress: string;
    private contractName: string;

    private constructor(config: HedgeContractConfig) {
        this.client = new AptosClient(config.nodeUrl);
        this.moduleAddress = config.moduleAddress;
        this.contractName = config.contractName;
        this.walletService = WalletService.getInstance(config.moduleAddress);
        this.eventTracker = EventTracker.getInstance();
    }

    public static getInstance(config: HedgeContractConfig): HedgeContractService {
        if (!HedgeContractService.instance) {
            HedgeContractService.instance = new HedgeContractService(config);
        }
        return HedgeContractService.instance;
    }

    // 创建对冲位置
    public async createHedgePosition(
        borrowerId: string,
        amount: number,
        hedgeRatio: number
    ): Promise<string> {
        try {
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::${this.contractName}::create_hedge_position`,
                type_arguments: [],
                arguments: [
                    borrowerId,
                    amount.toString(),
                    (hedgeRatio * 10000).toString() // 转换为基点
                ]
            };

            const response = await this.walletService.submitTransaction(payload);
            
            this.eventTracker.trackEvent('hedge_contract', 'create_position', 'success', amount, {
                borrowerId,
                hedgeRatio,
                txHash: response.hash
            });

            return response.hash;
        } catch (error) {
            this.eventTracker.trackEvent('hedge_contract', 'create_position', 'error', 0, {
                borrowerId,
                error: error.message
            });
            throw error;
        }
    }

    // 关闭对冲位置
    public async closeHedgePosition(positionId: string): Promise<string> {
        try {
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::${this.contractName}::close_hedge_position`,
                type_arguments: [],
                arguments: [positionId]
            };

            const response = await this.walletService.submitTransaction(payload);
            
            this.eventTracker.trackEvent('hedge_contract', 'close_position', 'success', 0, {
                positionId,
                txHash: response.hash
            });

            return response.hash;
        } catch (error) {
            this.eventTracker.trackEvent('hedge_contract', 'close_position', 'error', 0, {
                positionId,
                error: error.message
            });
            throw error;
        }
    }

    // 调整对冲比率
    public async adjustHedgeRatio(
        positionId: string,
        newRatio: number
    ): Promise<string> {
        try {
            const payload = {
                type: 'entry_function_payload',
                function: `${this.moduleAddress}::${this.contractName}::adjust_hedge_ratio`,
                type_arguments: [],
                arguments: [
                    positionId,
                    (newRatio * 10000).toString()
                ]
            };

            const response = await this.walletService.submitTransaction(payload);
            
            this.eventTracker.trackEvent('hedge_contract', 'adjust_ratio', 'success', 0, {
                positionId,
                newRatio,
                txHash: response.hash
            });

            return response.hash;
        } catch (error) {
            this.eventTracker.trackEvent('hedge_contract', 'adjust_ratio', 'error', 0, {
                positionId,
                error: error.message
            });
            throw error;
        }
    }

    // 获取对冲位置信息
    public async getHedgePosition(positionId: string): Promise<HedgePosition | null> {
        try {
            const resource = await this.client.getAccountResource(
                this.moduleAddress,
                `${this.moduleAddress}::${this.contractName}::HedgePosition`
            );

            const positions = (resource.data as any).positions;
            const position = positions[positionId];

            if (!position) return null;

            return {
                positionId,
                amount: Number(position.amount),
                openPrice: Number(position.open_price),
                hedgeRatio: Number(position.hedge_ratio) / 10000,
                timestamp: Number(position.timestamp),
                status: position.status
            };
        } catch (error) {
            console.error('Failed to get hedge position:', error);
            return null;
        }
    }

    // 获取用户所有对冲位置
    public async getUserHedgePositions(userAddress: string): Promise<HedgePosition[]> {
        try {
            const resource = await this.client.getAccountResource(
                userAddress,
                `${this.moduleAddress}::${this.contractName}::UserHedgeStore`
            );

            const positions = (resource.data as any).positions;
            return Object.entries(positions).map(([id, pos]: [string, any]) => ({
                positionId: id,
                amount: Number(pos.amount),
                openPrice: Number(pos.open_price),
                hedgeRatio: Number(pos.hedge_ratio) / 10000,
                timestamp: Number(pos.timestamp),
                status: pos.status
            }));
        } catch (error) {
            console.error('Failed to get user hedge positions:', error);
            return [];
        }
    }

    // 获取对冲合约统计信息
    public async getHedgeStats(): Promise<{
        totalPositions: number;
        totalHedgedAmount: number;
        averageHedgeRatio: number;
    }> {
        try {
            const resource = await this.client.getAccountResource(
                this.moduleAddress,
                `${this.moduleAddress}::${this.contractName}::HedgeStats`
            );

            const stats = resource.data as any;
            return {
                totalPositions: Number(stats.total_positions),
                totalHedgedAmount: Number(stats.total_hedged_amount),
                averageHedgeRatio: Number(stats.average_hedge_ratio) / 10000
            };
        } catch (error) {
            console.error('Failed to get hedge stats:', error);
            return {
                totalPositions: 0,
                totalHedgedAmount: 0,
                averageHedgeRatio: 0
            };
        }
    }

    // 监听对冲事件
    public async subscribeToHedgeEvents(
        callback: (event: any) => void
    ): Promise<number> {
        try {
            const handle = await this.client.getEventStream(
                this.moduleAddress,
                `${this.moduleAddress}::${this.contractName}::HedgeEvent`,
                "hedge_events"
            );

            // 处理事件流
            handle.on('data', (event: any) => {
                this.eventTracker.trackEvent('hedge_contract', 'event_received', 'success', 0, {
                    eventType: event.type,
                    data: event.data
                });
                callback(event);
            });

            return handle.id;
        } catch (error) {
            console.error('Failed to subscribe to hedge events:', error);
            throw error;
        }
    }

    // 取消事件订阅
    public async unsubscribeFromHedgeEvents(handleId: number): Promise<void> {
        try {
            await this.client.closeEventStream(handleId);
        } catch (error) {
            console.error('Failed to unsubscribe from hedge events:', error);
        }
    }

    // 验证对冲操作
    public async validateHedgeOperation(
        borrowerId: string,
        amount: number,
        hedgeRatio: number
    ): Promise<boolean> {
        try {
            const result = await this.client.simulateTransaction(
                await this.walletService.getAccount(),
                {
                    type: 'entry_function_payload',
                    function: `${this.moduleAddress}::${this.contractName}::validate_hedge_operation`,
                    type_arguments: [],
                    arguments: [
                        borrowerId,
                        amount.toString(),
                        (hedgeRatio * 10000).toString()
                    ]
                }
            );

            return result.success;
        } catch (error) {
            console.error('Failed to validate hedge operation:', error);
            return false;
        }
    }
}
