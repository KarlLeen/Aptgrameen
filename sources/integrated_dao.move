module aml::integrated_dao {
    use std::error;
    use std::signer;
    use std::vector;
    use aptos_std::fixed_point64::{FixedPoint64, create_from_rational};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_std::table;

    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EALREADY_MEMBER: u64 = 2;
    const ENOT_MEMBER: u64 = 3;
    const EALREADY_VOTED: u64 = 4;
    const EPROPOSAL_NOT_FOUND: u64 = 5;
    const EPROPOSAL_NOT_PASSED: u64 = 10;
    const EPROPOSAL_ALREADY_EXECUTED: u64 = 6;
    const ETIME_LOCK_NOT_EXPIRED: u64 = 7;
    const EINSUFFICIENT_VOTES: u64 = 8;
    const EINVALID_RATE: u64 = 9;

    // Constants
    const MIN_VOTES: u64 = 5;
    const TIME_LOCK_PERIOD: u64 = 86400; // 24 hours
    const MIN_INTEREST_RATE: u64 = 300;  // 3.00%
    const MAX_INTEREST_RATE: u64 = 2500; // 25.00%

    // Proposal types
    const PROPOSAL_TYPE_RATE_CHANGE: u8 = 1;
    const PROPOSAL_TYPE_MEMBER_ADD: u8 = 2;
    const PROPOSAL_TYPE_MEMBER_REMOVE: u8 = 3;
    const PROPOSAL_TYPE_PARAM_CHANGE: u8 = 4;

    // DAO configuration
    struct DaoConfig has key {
        members: vector<address>,
        min_votes_required: u64,
        time_lock_period: u64,
        base_rate: FixedPoint64,
        current_rate: FixedPoint64,
        rate_change_events: event::EventHandle<RateChangeEvent>,
        governance_events: event::EventHandle<GovernanceEvent>
    }

    // Proposal struct
    struct Proposal has key {
        proposer: address,
        proposal_type: u8,
        content: vector<u8>,
        voters: vector<address>,
        created_at: u64,
        executed: bool,
        votes_for: u64,
        votes_against: u64
    }

    // Rate change event
    struct RateChangeEvent has drop, store {
        old_rate: FixedPoint64,
        new_rate: FixedPoint64,
        timestamp: u64
    }

    // Governance event
    struct GovernanceEvent has drop, store {
        proposal_type: u8,
        proposer: address,
        timestamp: u64,
        success: bool
    }

    // Initialize DAO
    public entry fun initialize(admin: &signer) {
        assert!(signer::address_of(admin) == @aml, error::permission_denied(ENOT_AUTHORIZED));
        
        let members = vector::empty<address>();
        vector::push_back(&mut members, signer::address_of(admin));

        let base_rate = create_from_rational(3, 100); // 3%
        
        move_to(admin, DaoConfig {
            members,
            min_votes_required: MIN_VOTES,
            time_lock_period: TIME_LOCK_PERIOD,
            base_rate,
            current_rate: base_rate,
            rate_change_events: account::new_event_handle<RateChangeEvent>(admin),
            governance_events: account::new_event_handle<GovernanceEvent>(admin)
        });
    }

    // Create proposal
    public entry fun create_proposal(
        proposer: &signer,
        proposal_type: u8,
        content: vector<u8>
    ) acquires DaoConfig {
        let config = borrow_global<DaoConfig>(@aml);
        let proposer_addr = signer::address_of(proposer);
        
        assert!(vector::contains(&config.members, &proposer_addr), 
               error::permission_denied(ENOT_MEMBER));

        move_to(proposer, Proposal {
            proposer: proposer_addr,
            proposal_type,
            content,
            voters: vector::empty(),
            created_at: timestamp::now_microseconds(),
            executed: false,
            votes_for: 0,
            votes_against: 0
        });
    }

    // Vote on proposal
    public entry fun vote_on_proposal(
        voter: &signer,
        proposer: address,
        vote_for: bool
    ) acquires DaoConfig, Proposal {
        let config = borrow_global<DaoConfig>(@aml);
        let voter_addr = signer::address_of(voter);
        
        assert!(vector::contains(&config.members, &voter_addr), 
               error::permission_denied(ENOT_MEMBER));
        
        let proposal = borrow_global_mut<Proposal>(proposer);
        assert!(!vector::contains(&proposal.voters, &voter_addr), 
               error::invalid_state(EALREADY_VOTED));
        
        vector::push_back(&mut proposal.voters, voter_addr);
        if (vote_for) {
            proposal.votes_for = proposal.votes_for + 1;
        } else {
            proposal.votes_against = proposal.votes_against + 1;
        };
    }

    // Execute proposal
    public entry fun execute_proposal(
        executor: &signer,
        proposer: address
    ) acquires DaoConfig, Proposal {
        let config = borrow_global_mut<DaoConfig>(@aml);
        let proposal = borrow_global_mut<Proposal>(proposer);
        
        assert!(!proposal.executed, error::invalid_state(EPROPOSAL_ALREADY_EXECUTED));
        assert!(timestamp::now_microseconds() >= proposal.created_at + config.time_lock_period,
               error::invalid_state(ETIME_LOCK_NOT_EXPIRED));
        assert!(proposal.votes_for >= 1, error::invalid_state(EINSUFFICIENT_VOTES));
        assert!(proposal.votes_for > proposal.votes_against, error::invalid_state(EPROPOSAL_NOT_PASSED));

        // Execute based on proposal type
        if (proposal.proposal_type == PROPOSAL_TYPE_RATE_CHANGE) {
            execute_rate_change(config, proposal);
        } else if (proposal.proposal_type == PROPOSAL_TYPE_MEMBER_ADD) {
            execute_member_add(config, proposal);
        } else if (proposal.proposal_type == PROPOSAL_TYPE_MEMBER_REMOVE) {
            execute_member_remove(config, proposal);
        } else if (proposal.proposal_type == PROPOSAL_TYPE_PARAM_CHANGE) {
            execute_param_change(config, proposal);
        };

        proposal.executed = true;

        // Emit governance event
        event::emit_event(&mut config.governance_events, GovernanceEvent {
            proposal_type: proposal.proposal_type,
            proposer: proposal.proposer,
            timestamp: timestamp::now_microseconds(),
            success: true
        });
    }

    // Internal: Execute rate change
    fun execute_rate_change(config: &mut DaoConfig, proposal: &Proposal) {
        let old_rate = config.current_rate;
        let content_copy = *&proposal.content;
        let new_rate_raw = vector::pop_back(&mut content_copy);
        // Convert rate from percentage to basis points (e.g., 5% -> 500)
        let rate_in_bps = (new_rate_raw as u64) * 100;
        assert!(rate_in_bps >= MIN_INTEREST_RATE && rate_in_bps <= MAX_INTEREST_RATE,
                error::invalid_argument(EINVALID_RATE));

        let new_rate = create_from_rational((new_rate_raw as u128), 100); // Convert percentage to fixed point

        config.current_rate = new_rate;

        event::emit_event(&mut config.rate_change_events, RateChangeEvent {
            old_rate,
            new_rate,
            timestamp: timestamp::now_microseconds()
        });
    }

    // Add member (admin function)
    public entry fun add_member(admin: &signer, new_member: address) acquires DaoConfig {
        assert!(signer::address_of(admin) == @aml, error::permission_denied(ENOT_AUTHORIZED));
        let config = borrow_global_mut<DaoConfig>(@aml);
        if (!vector::contains(&config.members, &new_member)) {
            vector::push_back(&mut config.members, new_member);
        };
    }

    // Internal: Execute member addition
    fun execute_member_add(config: &mut DaoConfig, proposal: &Proposal) {
        let new_member = @0x1; // Default to resource account
        if (!vector::contains(&config.members, &new_member)) {
            vector::push_back(&mut config.members, new_member);
        };
    }

    // Internal: Execute member removal
    fun execute_member_remove(config: &mut DaoConfig, proposal: &Proposal) {
        let remove_member = @0x1; // Default to resource account
        let (found, index) = vector::index_of(&config.members, &remove_member);
        if (found) {
            vector::remove(&mut config.members, index);
        };
    }

    // Internal: Execute parameter change
    fun execute_param_change(config: &mut DaoConfig, proposal: &Proposal) {
        let param_type = *vector::borrow(&proposal.content, 0);
        let param_value = *vector::borrow(&proposal.content, 1);
        
        if (param_type == 0) { // min_votes_required
            config.min_votes_required = (param_value as u64);
        } else if (param_type == 1) { // time_lock_period
            config.time_lock_period = (param_value as u64);
        };
    }

    // Get current interest rate
    public fun get_current_rate(): FixedPoint64 acquires DaoConfig {
        borrow_global<DaoConfig>(@aml).current_rate
    }

    // Get member count
    public fun get_member_count(): u64 acquires DaoConfig {
        vector::length(&borrow_global<DaoConfig>(@aml).members)
    }


}
