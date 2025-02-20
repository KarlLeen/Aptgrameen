module aptgrameen::price_oracle {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;

    /// Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EINVALID_PRICE: u64 = 2;
    const EPRICE_NOT_FOUND: u64 = 3;

    /// Price data structure
    struct PriceData has key {
        price: u64,
        timestamp: u64,
        price_events: EventHandle<PriceEvent>
    }

    /// Price update event
    struct PriceEvent has store, drop {
        price: u64,
        timestamp: u64
    }

    /// Oracle admin data
    struct OracleAdmin has key {
        authorized_sources: vector<address>
    }

    /// Initialize price oracle
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        move_to(account, OracleAdmin {
            authorized_sources: vector::empty()
        });

        move_to(account, PriceData {
            price: 0,
            timestamp: 0,
            price_events: account::new_event_handle<PriceEvent>(account)
        });
    }

    /// Add authorized price source
    public entry fun add_authorized_source(
        admin: &signer,
        source: address
    ) acquires OracleAdmin {
        let admin_addr = signer::address_of(admin);
        assert!(exists<OracleAdmin>(admin_addr), ENOT_AUTHORIZED);
        
        let oracle_admin = borrow_global_mut<OracleAdmin>(admin_addr);
        if (!vector::contains(&oracle_admin.authorized_sources, &source)) {
            vector::push_back(&mut oracle_admin.authorized_sources, source);
        }
    }

    /// Update price
    public entry fun update_price(
        source: &signer,
        new_price: u64
    ) acquires OracleAdmin, PriceData {
        let source_addr = signer::address_of(source);
        let oracle_admin = borrow_global<OracleAdmin>(@aptgrameen);
        
        assert!(
            vector::contains(&oracle_admin.authorized_sources, &source_addr),
            ENOT_AUTHORIZED
        );
        assert!(new_price > 0, EINVALID_PRICE);

        let price_data = borrow_global_mut<PriceData>(@aptgrameen);
        price_data.price = new_price;
        price_data.timestamp = timestamp::now_microseconds();

        event::emit_event(
            &mut price_data.price_events,
            PriceEvent {
                price: new_price,
                timestamp: price_data.timestamp
            }
        );
    }

    /// Get current price
    public fun get_price(): u64 acquires PriceData {
        assert!(exists<PriceData>(@aptgrameen), EPRICE_NOT_FOUND);
        borrow_global<PriceData>(@aptgrameen).price
    }

    /// Get last update timestamp
    public fun get_last_update(): u64 acquires PriceData {
        assert!(exists<PriceData>(@aptgrameen), EPRICE_NOT_FOUND);
        borrow_global<PriceData>(@aptgrameen).timestamp
    }

    #[test]
    fun test_price_oracle() acquires OracleAdmin, PriceData {
        use aptos_framework::timestamp;

        // Setup test environment
        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        let admin = account::create_account_for_test(@aptgrameen);
        let source = account::create_account_for_test(@0x2);
        
        // Initialize oracle
        initialize(&admin);
        
        // Add authorized source
        add_authorized_source(&admin, @0x2);
        
        // Update price
        let test_price = 1500000;
        update_price(&source, test_price);
        
        // Verify price updated
        assert!(get_price() == test_price, 0);
        assert!(get_last_update() == timestamp::now_microseconds(), 0);
    }
}
