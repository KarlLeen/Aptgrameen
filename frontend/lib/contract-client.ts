import { Types, AptosClient } from 'aptos';

// Update this with your contract address
const MODULE_ADDRESS = '0x7921f7e9342c39d58dc627c73ae224380d877b9a838d9b7fba82f8fbde135821';
const MODULE_NAME = 'aptgrameen';

export class ContractClient {
  client: AptosClient;

  constructor(nodeUrl: string) {
    this.client = new AptosClient(nodeUrl);
  }

  // Credit Assessment Functions
  async getCreditScore(address: string): Promise<number> {
    try {
      const resource = await this.client.getAccountResource(
        address,
        `${MODULE_ADDRESS}::${MODULE_NAME}::CreditSBT`
      );
      return (resource.data as any).score;
    } catch (e) {
      console.error('Error getting credit score:', e);
      return 0;
    }
  }

  async getGroupInfo(address: string): Promise<any> {
    try {
      const resource = await this.client.getAccountResource(
        address,
        `${MODULE_ADDRESS}::${MODULE_NAME}::GroupCreditSBT`
      );
      return resource.data;
    } catch (e) {
      console.error('Error getting group info:', e);
      return null;
    }
  }

  // Group Management Functions
  async createGroup(
    signer: any,
    members: string[]
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_group`,
      type_arguments: [],
      arguments: [members]
    };

    return await this.submitTransaction(signer, payload);
  }

  async updateGroupScore(
    signer: any,
    groupId: string,
    newScore: number
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::update_group_score`,
      type_arguments: [],
      arguments: [groupId, newScore]
    };

    return await this.submitTransaction(signer, payload);
  }

  // Loan Management Functions
  async applyForLoan(
    signer: any,
    amount: number,
    purpose: string
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::apply_for_loan`,
      type_arguments: [],
      arguments: [amount, Array.from(new TextEncoder().encode(purpose))]
    };

    return await this.submitTransaction(signer, payload);
  }

  async getLoanStatus(address: string): Promise<any> {
    try {
      const resource = await this.client.getAccountResource(
        address,
        `${MODULE_ADDRESS}::${MODULE_NAME}::LoanInfo`
      );
      return resource.data;
    } catch (e) {
      console.error('Error getting loan status:', e);
      return null;
    }
  }

  async approveLoan(
    signer: any,
    borrower: string,
    loanId: string
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::approve_loan`,
      type_arguments: [],
      arguments: [borrower, loanId]
    };

    return await this.submitTransaction(signer, payload);
  }

  // DAO Functions
  async createProposal(
    signer: any,
    proposalType: number,
    content: string
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_proposal`,
      type_arguments: [],
      arguments: [proposalType, Array.from(new TextEncoder().encode(content))]
    };

    return await this.submitTransaction(signer, payload);
  }

  async castVote(
    signer: any,
    proposalId: string,
    vote: boolean
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::cast_vote`,
      type_arguments: [],
      arguments: [proposalId, vote]
    };

    return await this.submitTransaction(signer, payload);
  }

  async getDAOConfig(): Promise<any> {
    try {
      const resource = await this.client.getAccountResource(
        MODULE_ADDRESS,
        `${MODULE_ADDRESS}::${MODULE_NAME}::DaoConfig`
      );
      return resource.data;
    } catch (e) {
      console.error('Error getting DAO config:', e);
      return null;
    }
  }

  // AI Interview Functions
  async submitInterviewResult(
    signer: any,
    score: number,
    feedback: string
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::submit_interview_result`,
      type_arguments: [],
      arguments: [score, Array.from(new TextEncoder().encode(feedback))]
    };

    return await this.submitTransaction(signer, payload);
  }

  private async submitTransaction(
    signer: any,
    payload: Types.TransactionPayload
  ): Promise<string> {
    try {
      const txnRequest = await this.client.generateTransaction(signer.address, payload);
      const signedTxn = await signer.signTransaction(txnRequest);
      const response = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(response.hash);
      return response.hash;
    } catch (e) {
      console.error('Error submitting transaction:', e);
      throw e;
    }
  }

  // Hedge Functions
  async getHedgePositions(address: string): Promise<any[]> {
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::hedge_contract::get_positions`,
        type_arguments: [],
        arguments: [address]
      };

      const positions = await this.client.view(payload);
      return positions;
    } catch (e) {
      console.error('Error getting hedge positions:', e);
      return [];
    }
  }

  async createHedgePosition(
    signer: any,
    borrowerId: string,
    amount: number,
    hedgeRatio: number
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::hedge_contract::create_hedge_position`,
      type_arguments: [],
      arguments: [borrowerId, amount, hedgeRatio]
    };

    return await this.submitTransaction(signer, payload);
  }

  async adjustHedgeRatio(
    signer: any,
    positionId: string,
    newRatio: number
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::hedge_contract::adjust_hedge_ratio`,
      type_arguments: [],
      arguments: [positionId, newRatio]
    };

    return await this.submitTransaction(signer, payload);
  }

  async closeHedgePosition(
    signer: any,
    positionId: string
  ): Promise<string> {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::hedge_contract::close_hedge_position`,
      type_arguments: [],
      arguments: [positionId]
    };

    return await this.submitTransaction(signer, payload);
  }
}
