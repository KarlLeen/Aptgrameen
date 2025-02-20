module aml::ai_oracle {
    use std::error;
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    
    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EINVALID_DATA: u64 = 2;
    const EINVALID_RESPONSE: u64 = 3;
    const EREQUEST_NOT_FOUND: u64 = 4;
    const ERESPONSE_PENDING: u64 = 5;

    // Oracle request status
    const STATUS_PENDING: u8 = 0;
    const STATUS_FULFILLED: u8 = 1;
    const STATUS_ERROR: u8 = 2;

    // Oracle configuration
    struct OracleConfig has key {
        authorized_sources: vector<address>,
        request_count: u64,
        requests: Table<u64, OracleRequest>,
        responses: Table<u64, OracleResponse>,
        oracle_events: EventHandle<OracleEvent>
    }

    // Oracle request
    struct OracleRequest has store {
        requester: address,
        request_type: u8,
        data: vector<u8>,
        status: u8,
        created_at: u64
    }

    // Oracle response
    struct OracleResponse has store {
        request_id: u64,
        response_data: vector<u8>,
        source: address,
        timestamp: u64
    }

    // Oracle event
    struct OracleEvent has drop, store {
        request_id: u64,
        request_type: u8,
        status: u8,
        timestamp: u64
    }

    // Initialize oracle
    public entry fun initialize(admin: &signer) {
        assert!(signer::address_of(admin) == @aml, error::permission_denied(ENOT_AUTHORIZED));
        
        if (!exists<OracleConfig>(@aml)) {
            let authorized_sources = vector::empty();
            vector::push_back(&mut authorized_sources, signer::address_of(admin));
            
            move_to(admin, OracleConfig {
                authorized_sources,
                request_count: 0,
                requests: table::new(),
                responses: table::new(),
                oracle_events: account::new_event_handle<OracleEvent>(admin)
            });
        };
    }

    // Add authorized source
    public entry fun add_authorized_source(
        admin: &signer,
        source: address
    ) acquires OracleConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @aml, error::permission_denied(ENOT_AUTHORIZED));
        
        let config = borrow_global_mut<OracleConfig>(@aml);
        if (!vector::contains(&config.authorized_sources, &source)) {
            vector::push_back(&mut config.authorized_sources, source);
        };
    }

    // Submit oracle request
    public fun submit_request(
        requester: &signer,
        request_type: u8,
        data: vector<u8>
    ): u64 acquires OracleConfig {
        let config = borrow_global_mut<OracleConfig>(@aml);
        let request_id = config.request_count + 1;
        
        table::add(&mut config.requests, request_id, OracleRequest {
            requester: signer::address_of(requester),
            request_type,
            data,
            status: STATUS_PENDING,
            created_at: timestamp::now_microseconds()
        });
        
        config.request_count = request_id;
        
        event::emit_event(&mut config.oracle_events, OracleEvent {
            request_id,
            request_type,
            status: STATUS_PENDING,
            timestamp: timestamp::now_microseconds()
        });

        request_id
    }

    // Submit oracle response
    public entry fun submit_response(
        source: &signer,
        request_id: u64,
        response_data: vector<u8>
    ) acquires OracleConfig {
        let config = borrow_global_mut<OracleConfig>(@aml);
        let source_addr = signer::address_of(source);
        
        assert!(vector::contains(&config.authorized_sources, &source_addr),
               error::permission_denied(ENOT_AUTHORIZED));
        assert!(table::contains(&config.requests, request_id),
               error::not_found(EREQUEST_NOT_FOUND));
        
        let request = table::borrow_mut(&mut config.requests, request_id);
        assert!(request.status == STATUS_PENDING, error::invalid_state(ERESPONSE_PENDING));
        
        request.status = STATUS_FULFILLED;
        
        table::add(&mut config.responses, request_id, OracleResponse {
            request_id,
            response_data,
            source: source_addr,
            timestamp: timestamp::now_microseconds()
        });
        
        event::emit_event(&mut config.oracle_events, OracleEvent {
            request_id,
            request_type: request.request_type,
            status: STATUS_FULFILLED,
            timestamp: timestamp::now_microseconds()
        });
    }

    // Get oracle response
    public fun get_response(request_id: u64): (vector<u8>, address, u64) acquires OracleConfig {
        let config = borrow_global<OracleConfig>(@aml);
        
        assert!(table::contains(&config.responses, request_id),
               error::not_found(EREQUEST_NOT_FOUND));
        
        let response = table::borrow(&config.responses, request_id);
        (response.response_data, response.source, response.timestamp)
    }

    // Check if response is available
    public fun has_response(request_id: u64): bool acquires OracleConfig {
        let config = borrow_global<OracleConfig>(@aml);
        table::contains(&config.responses, request_id)
    }

    // Get request status
    public fun get_request_status(request_id: u64): u8 acquires OracleConfig {
        let config = borrow_global<OracleConfig>(@aml);
        
        assert!(table::contains(&config.requests, request_id),
               error::not_found(EREQUEST_NOT_FOUND));
        
        table::borrow(&config.requests, request_id).status
    }
}
