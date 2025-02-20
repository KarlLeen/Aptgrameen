module aptgrameen::hedge_contract {
    use std::string::{Self, String};
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use std::signer;
    use std::vector;
    use std::bcs;

    /// Hedge position status
    const POSITION_STATUS_OPEN: u8 = 1;
    const POSITION_STATUS_CLOSED: u8 = 2;

    /// Error codes
    const EINVALID_AMOUNT: u64 = 1;
    const EINVALID_RATIO: u64 = 2;
    const EPOSITION_NOT_FOUND: u64 = 3;
    const EPOSITION_ALREADY_CLOSED: u64 = 4;
    const EUNAUTHORIZED: u64 = 5;

    /// Hedge position
    struct HedgePosition has copy, store, drop {
        position_id: String,
        borrower_id: String,
        amount: u64,
        hedge_ratio: u64,  //  (1% = 100)
        open_price: u64,
        timestamp: u64,
        status: u8
    }

    ///
    struct UserHedgeStore has key {
        positions: vector<HedgePosition>,
        position_events: EventHandle<HedgeEvent>
    }

    /// Global hedge statistics
    struct HedgeStats has key {
        total_positions: u64,
        total_hedged_amount: u64,
        average_hedge_ratio: u64
    }

    /// Hedge position event
    struct HedgeEvent has store, drop {
        position_id: String,
        event_type: String,
        amount: u64,
        hedge_ratio: u64,
        timestamp: u64
    }

    /// Initialize hedge contract
    public fun initialize(account: &signer) {
        move_to(account, HedgeStats {
            total_positions: 0,
            total_hedged_amount: 0,
            average_hedge_ratio: 0
        });
    }

    /// Create hedge position
    public entry fun create_hedge_position(
        account: &signer,
        borrower_id: String,
        amount: u64,
        hedge_ratio: u64
    ) acquires HedgeStats, UserHedgeStore {
        // Validate parameters
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(hedge_ratio > 0 && hedge_ratio <= 10000, EINVALID_RATIO);

        let account_addr = signer::address_of(account);
        
        // Initialize store if not exists
        if (!exists<UserHedgeStore>(account_addr)) {
            move_to(account, UserHedgeStore {
                positions: vector::empty(),
                position_events: account::new_event_handle<HedgeEvent>(account)
            });
        };

        // Create new hedge position
        let position_copy = HedgePosition {
            position_id: generate_position_id(account_addr, borrower_id),
            borrower_id,
            amount,
            hedge_ratio,
            open_price: get_current_price(), // Get current market price
            timestamp: timestamp::now_microseconds(),
            status: POSITION_STATUS_OPEN
        };

        // Update global stats
        let stats = borrow_global_mut<HedgeStats>(@aptgrameen);
        stats.total_positions = stats.total_positions + 1;
        stats.total_hedged_amount = stats.total_hedged_amount + amount;
        stats.average_hedge_ratio = calculate_average_ratio(
            stats.average_hedge_ratio,
            stats.total_positions,
            hedge_ratio
        );

        // Add position to store
        let store = borrow_global_mut<UserHedgeStore>(account_addr);
        vector::push_back(&mut store.positions, *&position_copy);

        // Emit position created event
        event::emit_event(
            &mut store.position_events,
            HedgeEvent {
                position_id: position_copy.position_id,
                event_type: string::utf8(b"created"),
                amount: position_copy.amount,
                hedge_ratio: position_copy.hedge_ratio,
                timestamp: timestamp::now_microseconds()
            }
        );
    }

    /// Close hedge position
    public entry fun close_hedge_position(
        account: &signer,
        position_id: String
    ) acquires UserHedgeStore, HedgeStats {
        let account_addr = signer::address_of(account);
        let store = borrow_global_mut<UserHedgeStore>(account_addr);
        
        // Find position to close
        let found = false;
        let len = vector::length(&store.positions);
        let i = 0;
        while (i < len) {
            let position = vector::borrow_mut(&mut store.positions, i);
            if (position.position_id == position_id) {
                assert!(position.status == POSITION_STATUS_OPEN, EPOSITION_ALREADY_CLOSED);
                position.status = POSITION_STATUS_CLOSED;
                found = true;
                
                // Update global stats
                let stats = borrow_global_mut<HedgeStats>(@aptgrameen);
                stats.total_hedged_amount = stats.total_hedged_amount - position.amount;
                
                // Emit position closed event
                event::emit_event(
                    &mut store.position_events,
                    HedgeEvent {
                        position_id: position.position_id,
                        event_type: string::utf8(b"closed"),
                        amount: position.amount,
                        hedge_ratio: position.hedge_ratio,
                        timestamp: timestamp::now_microseconds()
                    }
                );
                break
            };
            i = i + 1;
        };
        
        assert!(found, EPOSITION_NOT_FOUND);
    }

    /// 
    public entry fun adjust_hedge_ratio(
        account: &signer,
        position_id: String,
        new_ratio: u64
    ) acquires UserHedgeStore {
        assert!(new_ratio > 0 && new_ratio <= 10000, EINVALID_RATIO);
        
        let account_addr = signer::address_of(account);
        let store = borrow_global_mut<UserHedgeStore>(account_addr);
        
        // Find position to adjust
        let found = false;
        let len = vector::length(&store.positions);
        let i = 0;
        while (i < len) {
            let position = vector::borrow_mut(&mut store.positions, i);
            if (position.position_id == position_id) {
                assert!(position.status == POSITION_STATUS_OPEN, EPOSITION_ALREADY_CLOSED);
                position.hedge_ratio = new_ratio;
                found = true;
                
                // Emit ratio adjusted event
                event::emit_event(
                    &mut store.position_events,
                    HedgeEvent {
                        position_id: position.position_id,
                        event_type: string::utf8(b"adjusted"),
                        amount: position.amount,
                        hedge_ratio: new_ratio,
                        timestamp: timestamp::now_microseconds()
                    }
                );
                break
            };
            i = i + 1;
        };
        
        assert!(found, EPOSITION_NOT_FOUND);
    }

    /// Get current market price from oracle
    fun get_current_price(): u64 {
        aptgrameen::price_oracle::get_price()
    }

    /// Generate unique position ID by combining account address, borrower ID and timestamp
    fun generate_position_id(account_addr: address, borrower_id: String): String {
        let timestamp = timestamp::now_microseconds();
        let timestamp_bytes = bcs::to_bytes(&timestamp);
        let timestamp_hex = string::utf8(timestamp_bytes);
        let addr_bytes = bcs::to_bytes(&account_addr);
        let addr_hex = string::utf8(addr_bytes);
        
        let id = string::utf8(b"H-");
        string::append(&mut id, addr_hex);
        string::append(&mut id, string::utf8(b"-"));
        string::append(&mut id, borrower_id);
        string::append(&mut id, string::utf8(b"-T-"));
        string::append(&mut id, timestamp_hex);
        id
    }

    #[view]
    public fun get_positions(account_addr: address): vector<HedgePosition> acquires UserHedgeStore {
        if (!exists<UserHedgeStore>(account_addr)) {
            return vector::empty()
        };
        let store = borrow_global<UserHedgeStore>(account_addr);
        store.positions
    }

    /// Calculate new average ratio
    fun calculate_average_ratio(
        current_average: u64,
        total_positions: u64,
        new_ratio: u64
    ): u64 {
        if (total_positions == 0) {
            new_ratio
        } else {
            (current_average * (total_positions - 1) + new_ratio) / total_positions
        }
    }

    #[test]
    fun test_create_hedge_position() acquires HedgeStats, UserHedgeStore {
        use aptos_framework::timestamp;

        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        // Initialize price oracle
        let admin = account::create_account_for_test(@aptgrameen);
        aptgrameen::price_oracle::initialize(&admin);
        let oracle = account::create_account_for_test(@0x2);
        aptgrameen::price_oracle::add_authorized_source(&admin, @0x2);
        aptgrameen::price_oracle::update_price(&oracle, 1000000);

        // Initialize hedge contract
        let account = account::create_account_for_test(@0x1);
        initialize(&admin);

        // Initialize user store
        if (!exists<UserHedgeStore>(signer::address_of(&account))) {
            move_to(&account, UserHedgeStore {
                positions: vector::empty(),
                position_events: account::new_event_handle<HedgeEvent>(&account)
            });
        };

        // Create hedge position
        let borrower_id = string::utf8(b"borrower1");
        let amount = 1000000;
        let hedge_ratio = 5000; // 50%

        create_hedge_position(&account, copy borrower_id, amount, hedge_ratio);

        // Verify position created
        let store = borrow_global<UserHedgeStore>(@0x1);
        let stats = borrow_global<HedgeStats>(@aptgrameen);

        assert!(vector::length(&store.positions) == 1, 0);
        assert!(stats.total_positions == 1, 0);
        assert!(stats.total_hedged_amount == amount, 0);
        assert!(stats.average_hedge_ratio == hedge_ratio, 0);

        let position = vector::borrow(&store.positions, 0);
        assert!(position.borrower_id == borrower_id, 0);
        assert!(position.amount == amount, 0);
        assert!(position.hedge_ratio == hedge_ratio, 0);
        assert!(position.status == POSITION_STATUS_OPEN, 0);
    }

    #[test]
    fun test_close_hedge_position() acquires HedgeStats, UserHedgeStore {
        use aptos_framework::timestamp;

        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        // Initialize price oracle
        let admin = account::create_account_for_test(@aptgrameen);
        aptgrameen::price_oracle::initialize(&admin);
        let oracle = account::create_account_for_test(@0x2);
        aptgrameen::price_oracle::add_authorized_source(&admin, @0x2);
        aptgrameen::price_oracle::update_price(&oracle, 1000000);

        // Initialize hedge contract
        let account = account::create_account_for_test(@0x1);
        initialize(&admin);

        // Initialize user store
        if (!exists<UserHedgeStore>(signer::address_of(&account))) {
            move_to(&account, UserHedgeStore {
                positions: vector::empty(),
                position_events: account::new_event_handle<HedgeEvent>(&account)
            });
        };

        // Create hedge position
        let borrower_id = string::utf8(b"borrower1");
        let amount = 1000000;
        let hedge_ratio = 5000;

        create_hedge_position(&account, copy borrower_id, amount, hedge_ratio);

        // Get position ID
        let store = borrow_global<UserHedgeStore>(signer::address_of(&account));
        let position = vector::borrow(&store.positions, 0);
        let position_id = position.position_id;

        // Close position
        close_hedge_position(&account, position_id);

        // Verify position closed
        let store = borrow_global<UserHedgeStore>(signer::address_of(&account));
        let stats = borrow_global<HedgeStats>(@aptgrameen);

        assert!(stats.total_hedged_amount == 0, 0);
        let position = vector::borrow(&store.positions, 0);
        assert!(position.status == POSITION_STATUS_CLOSED, 0);
    }

    #[test]
    fun test_adjust_hedge_ratio() acquires HedgeStats, UserHedgeStore {
        use aptos_framework::timestamp;

        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        // Initialize price oracle
        let admin = account::create_account_for_test(@aptgrameen);
        aptgrameen::price_oracle::initialize(&admin);
        let oracle = account::create_account_for_test(@0x2);
        aptgrameen::price_oracle::add_authorized_source(&admin, @0x2);
        aptgrameen::price_oracle::update_price(&oracle, 1000000);

        // Initialize hedge contract
        let account = account::create_account_for_test(@0x1);
        initialize(&admin);

        // Initialize user store
        if (!exists<UserHedgeStore>(signer::address_of(&account))) {
            move_to(&account, UserHedgeStore {
                positions: vector::empty(),
                position_events: account::new_event_handle<HedgeEvent>(&account)
            });
        };

        // Create hedge position
        let borrower_id = string::utf8(b"borrower1");
        let amount = 1000000;
        let hedge_ratio = 5000;

        create_hedge_position(&account, copy borrower_id, amount, hedge_ratio);

        // Get position ID
        let store = borrow_global<UserHedgeStore>(signer::address_of(&account));
        let position = vector::borrow(&store.positions, 0);
        let position_id = position.position_id;

        // Adjust ratio
        let new_ratio = 6000;
        adjust_hedge_ratio(&account, position_id, new_ratio);

        // Verify ratio adjusted
        let store = borrow_global<UserHedgeStore>(signer::address_of(&account));
        let position = vector::borrow(&store.positions, 0);
        assert!(position.hedge_ratio == new_ratio, 0);
    }
}
