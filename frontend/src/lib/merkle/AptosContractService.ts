import { AptosClient, AptosAccount, TxnBuilderTypes, Types } from 'aptos';
import { ContractConfig, ContractFunction, ContractEvent } from './types';

export class AptosContractService {
    private static instance: AptosContractService;
    private client: AptosClient;
    private contracts: Map<string, ContractConfig>;
    private eventListeners: Map<string, ((event: ContractEvent) => void)[]>;

    private constructor(nodeUrl: string) {
        this.client = new AptosClient(nodeUrl);
        this.contracts = new Map();
        this.eventListeners = new Map();
    }

    public static getInstance(nodeUrl: string): AptosContractService {
        if (!AptosContractService.instance) {
            AptosContractService.instance = new AptosContractService(nodeUrl);
        }
        return AptosContractService.instance;
    }

    public async deployContract(
        account: AptosAccount,
        moduleBytes: Uint8Array,
        metadata: ContractConfig
    ): Promise<Types.Transaction> {
        try {
            const txnHash = await this.client.publishPackage(
                account,
                [moduleBytes],
                [metadata]
            );

            // 保存合约配置
            this.contracts.set(metadata.name, metadata);

            return await this.client.waitForTransactionWithResult(txnHash);
        } catch (error) {
            console.error('Failed to deploy contract:', error);
            throw error;
        }
    }

    public async callFunction(
        account: AptosAccount,
        contractName: string,
        functionName: string,
        args: any[]
    ): Promise<Types.Transaction> {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract ${contractName} not found`);
        }

        const func = contract.functions.find(f => f.name === functionName);
        if (!func) {
            throw new Error(`Function ${functionName} not found in contract ${contractName}`);
        }

        try {
            const payload = {
                function: `${contract.address}::${contract.name}::${functionName}`,
                type_arguments: [],
                arguments: args
            };

            const txnRequest = await this.client.generateTransaction(
                account.address(),
                payload
            );
            const signedTxn = await this.client.signTransaction(account, txnRequest);
            const pendingTxn = await this.client.submitTransaction(signedTxn);
            return await this.client.waitForTransaction(pendingTxn.hash);
        } catch (error) {
            console.error('Failed to call contract function:', error);
            throw error;
        }
    }

    public async queryState(
        contractName: string,
        resource: string,
        account?: string
    ): Promise<any> {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract ${contractName} not found`);
        }

        try {
            const address = account || contract.address;
            const resourceType = `${contract.address}::${contract.name}::${resource}`;
            return await this.client.getAccountResource(address, resourceType);
        } catch (error) {
            console.error('Failed to query contract state:', error);
            throw error;
        }
    }

    public subscribeToEvents(
        contractName: string,
        eventName: string,
        callback: (event: ContractEvent) => void
    ): void {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract ${contractName} not found`);
        }

        const eventKey = `${contractName}:${eventName}`;
        const listeners = this.eventListeners.get(eventKey) || [];
        listeners.push(callback);
        this.eventListeners.set(eventKey, listeners);

        // 开始监听事件
        this.startEventListener(contract, eventName);
    }

    private async startEventListener(
        contract: ContractConfig,
        eventName: string
    ): Promise<void> {
        const eventKey = `${contract.name}:${eventName}`;
        const eventHandle = `${contract.address}::${contract.name}::${eventName}`;

        try {
            // 使用 Aptos 客户端的事件流 API
            // 获取事件
            const events = await this.client.getEventsByEventHandle(
                contract.address,
                eventHandle,
                { start: 0, limit: 100 }
            );

            // 处理事件
            events.forEach((event: ContractEvent) => {
                const listeners = this.eventListeners.get(eventKey) || [];
                listeners.forEach(callback => callback(event));
            });

            // 设置定期轮询
            setInterval(async () => {
                try {
                    const newEvents = await this.client.getEventsByEventHandle(
                        contract.address,
                        eventHandle,
                        { start: events.length, limit: 100 }
                    );

                    newEvents.forEach((event: ContractEvent) => {
                        const listeners = this.eventListeners.get(eventKey) || [];
                        listeners.forEach(callback => callback(event));
                    });
                } catch (error) {
                    console.error('Event polling error:', error);
                }
            }, 5000); // 每5秒轮询一次
        } catch (error) {
            console.error('Failed to start event listener:', error);
            // 尝试重新连接
            setTimeout(() => this.startEventListener(contract, eventName), 5000);
        }
    }

    public unsubscribeFromEvents(
        contractName: string,
        eventName: string,
        callback?: (event: ContractEvent) => void
    ): void {
        const eventKey = `${contractName}:${eventName}`;
        if (callback) {
            // 移除特定的回调
            const listeners = this.eventListeners.get(eventKey) || [];
            const updatedListeners = listeners.filter(cb => cb !== callback);
            this.eventListeners.set(eventKey, updatedListeners);
        } else {
            // 移除所有回调
            this.eventListeners.delete(eventKey);
        }
    }

    public getContractConfig(name: string): ContractConfig | undefined {
        return this.contracts.get(name);
    }

    public getFunctionABI(
        contractName: string,
        functionName: string
    ): ContractFunction | undefined {
        const contract = this.contracts.get(contractName);
        return contract?.functions.find(f => f.name === functionName);
    }

    public async getTransactionStatus(
        txHash: string
    ): Promise<Types.Transaction> {
        try {
            return await this.client.getTransactionByHash(txHash);
        } catch (error) {
            console.error('Failed to get transaction status:', error);
            throw error;
        }
    }

    public async waitForTransaction(
        txHash: string,
        timeoutMs: number = 30000
    ): Promise<Types.Transaction> {
        try {
            return await this.client.waitForTransactionWithResult(txHash, {
                timeoutSecs: timeoutMs / 1000
            });
        } catch (error) {
            console.error('Failed to wait for transaction:', error);
            throw error;
        }
    }
}
