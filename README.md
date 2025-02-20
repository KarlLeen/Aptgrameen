# Aptgrameen

A decentralized peer-to-peer lending protocol built on Aptos blockchain, featuring advanced Merkle-based trading mechanisms, Move Agent Kit, SBT-based credit scoring, and AI-powered credit assessment.

## Technology Stack

### Smart Contracts (Backend)
- **Blockchain**: Aptos
- **Language**: Move
- **Key Components**:
  - Merkle-Trade System
  - Move Agent Kit
  - Credit Scoring SBT (Soul Bound Token)
  - DAO Governance Module
  - AI Credit Engine Oracle

### Frontend
- **Framework**: Next.js 14 (React)
- **UI Libraries**:
  - shadcn/ui (Based on Radix UI)
  - Tailwind CSS
- **Trading Features**:
  - Real-time order book visualization
  - Merkle proof generation and verification
  - Agent strategy configuration interface
- **AI Integration**:
  - Local AI model for trading analysis
  - Real-time market data processing
  - Agent performance monitoring
- **Development Tools**: 
  - TypeScript
  - WebSocket for real-time updates
  - TradingView integration

### Trading Components
- **Merkle System**: 
  - Efficient order matching engine
  - Proof generation and verification
  - Batch processing optimization
- **Agent System**: 
  - AI-powered trading strategies
  - Real-time market analysis
  - Risk management automation
- **Integration Layer**: 
  - Event processing pipeline
  - Cross-chain compatibility
  - Performance monitoring
 
    
## vedio
https://drive.google.com/file/d/1PMm-RGJaXs35-ciy1P2v9qXGAGxJq08n/view?usp=sharing
[https://photos.google.com/photo/AF1QipN2DMeBECm75JJ1qxXynD72Hk5OWNuj6GszO5rP](https://photos.google.com/photo/AF1QipPgePhyzBKHuvx2eo7XDmPkXx4kkGtyaTyu9aWH)
<img width="1470" alt="image" src="https://github.com/user-attachments/assets/49841023-f552-4858-9793-d6ad3ac24bdb" />
<img width="1470" alt="image" src="https://github.com/user-attachments/assets/1d5ccbf0-f82c-40a7-a944-0a5e35a878f9" />
<img width="1470" alt="image" src="https://github.com/user-attachments/assets/f772c1f7-3539-410a-a2e2-f3160fc0d6ed" />
<img width="1085" alt="image" src="https://github.com/user-attachments/assets/0ec83211-0b6b-4a00-b98f-15129fb5a56f" />
https://photos.google.com/photo/AF1QipPgePhyzBKHuvx2eo7XDmPkXx4kkGtyaTyu9aWH



## Core Features

### Merkle-Trade System

The Merkle-Trade system is a sophisticated trading mechanism that leverages Merkle trees for efficient and secure order matching:

- **Efficient Order Matching**: Utilizes Merkle trees to batch and verify multiple trades
- **Gas Optimization**: Reduces on-chain costs by processing multiple trades with a single Merkle root
- **Trade Security**: Ensures trade integrity through cryptographic proofs
- **Scalability**: Supports high-frequency trading with minimal blockchain overhead

Example usage:
```move
// Create a new trade order
public fun create_order(
    trader: &signer,
    amount: u64,
    price: u64,
    is_buy: bool
) {
    // Order details are hashed and included in the Merkle tree
    let order_hash = hash_order(amount, price, is_buy);
    add_to_merkle_tree(order_hash);
}

// Execute trades with Merkle proof verification
public fun execute_trade(
    proof: vector<vector<u8>>,
    root: vector<u8>,
    trade_data: TradeData
) {
    // Verify the trade is part of the Merkle tree
    assert!(verify_merkle_proof(proof, root, trade_data));
    // Execute the trade
    process_trade(trade_data);
}
```

### Move Agent Kit

The Move Agent Kit is a powerful framework for building autonomous agents on Aptos:

- **AI Integration**: Seamless integration with AI models for automated decision-making
- **Event Processing**: Efficient handling of blockchain events
- **Risk Management**: Automated risk assessment and position management
- **Strategy Execution**: Flexible framework for implementing trading strategies

Example implementation:
```move
module apl::trading_agent {
    use std::event;
    use aptos_framework::account;
    
    struct TradingAgent has key {
        // Agent configuration
        risk_params: RiskParameters,
        strategy: TradingStrategy,
        performance_metrics: PerformanceMetrics
    }

    // Initialize a new trading agent with AI capabilities
    public fun initialize_agent(
        account: &signer,
        strategy_type: u8,
        risk_level: u8
    ) {
        // Configure AI model and risk parameters
        let agent = create_agent_with_ai(strategy_type, risk_level);
        move_to(account, agent);
    }

    // Execute automated trading strategy
    public fun execute_strategy(agent: &mut TradingAgent) {
        // AI-powered market analysis
        let market_state = analyze_market();
        // Generate trading signals
        let signals = generate_trading_signals(market_state);
        // Execute trades based on signals
        process_trading_signals(signals);
    }
}
```

## Getting Started

### Prerequisites

- Aptos CLI
- Node.js >= 18
- Move Compiler

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/apl.git
cd apl
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Deploy contracts:
```bash
aptos move publish --named-addresses apl=default
```

4. Start the frontend:
```bash
npm run dev
```

## Project Structure

```
├── sources/                  # Smart Contracts
│   ├── merkle_trade/        # Merkle-based Trading System
│   │   ├── engine.move      # Core matching engine
│   │   ├── proof.move       # Merkle proof verification
│   │   └── types.move       # Trading data structures
│   ├── agent_kit/           # Move Agent Kit
│   │   ├── agent.move       # Base agent implementation
│   │   ├── strategy.move    # Trading strategy framework
│   │   └── risk.move        # Risk management system
│   ├── credit_sbt.move      # Credit scoring SBT
│   └── oracle.move          # Price and data oracles
├── frontend/                # Web Interface
│   ├── components/          # React components
│   │   ├── trading/         # Trading interface
│   │   └── agent/           # Agent configuration
│   └── lib/                 # Utility functions
│       ├── merkle.ts        # Merkle tree operations
│       └── agent.ts         # Agent interaction

## Contributing

We welcome contributions! Please check our contribution guidelines before submitting pull requests.

## License

MIT License






  - Dark/light mode support
  - Accessible components

### 3. AI Integration Layer
- **Interview System**:
  - Natural language processing
  - Real-time credit assessment
  - Score generation
- **Oracle System**:
  - Decentralized verification
  - Result submission
  - Score validation

## Development Setup

1. Install Dependencies:
   ```bash
   # Smart Contract Development
   aptos move compile
   aptos move test

   # Frontend Development
   cd frontend
   npm install
   npm run dev
   ```

2. Configure Environment:
   - Set up Aptos CLI
   - Configure Aptos Devnet
   - Set up environment variables

## Security Features

- Linear resource types for asset safety
- Access control mechanisms
- Formal verification ready
- Secure wallet integration
- Protected API endpoints

## License

MIT
