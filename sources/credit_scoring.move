module apl::credit_scoring {
    use std::signer;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;

    /// Invalid credit score range
    const EINVALID_SCORE_RANGE: u64 = 1;
    /// Invalid weights configuration
    const EINVALID_WEIGHTS: u64 = 2;
    /// Credit score not initialized
    const ENOT_INITIALIZED: u64 = 3;
    /// Invalid update frequency
    const EINVALID_UPDATE_FREQUENCY: u64 = 4;

    /// Credit score configuration
    struct CreditScoreConfig has key {
        base_score: u64,
        min_score: u64,
        max_score: u64,
        update_frequency: u64,
        weights: Weights,
        risk_levels: RiskLevels
    }

    /// Weight configuration
    struct Weights has store, drop {
        payment_history: u64,
        credit_utilization: u64,
        credit_history: u64,
        new_credit: u64,
        credit_mix: u64
    }

    /// Risk level configuration
    struct RiskLevels has store, drop {
        low_min: u64,
        low_max: u64,
        medium_min: u64,
        medium_max: u64,
        high_min: u64,
        high_max: u64
    }

    /// Credit score data
    struct CreditScore has key {
        score: u64,
        last_update: u64,
        factors: CreditFactors,
        risk_level: u8, // 0: low, 1: medium, 2: high
        history: vector<HistoryEntry>,
        score_update_events: EventHandle<ScoreUpdateEvent>
    }

    /// Credit factors
    struct CreditFactors has copy, store, drop {
        payment_history: u64,
        credit_utilization: u64,
        credit_history: u64,
        new_credit: u64,
        credit_mix: u64
    }

    /// History entry
    struct HistoryEntry has store, drop {
        timestamp: u64,
        score: u64,
        factors: CreditFactors
    }

    /// Score update event
    struct ScoreUpdateEvent has drop, store {
        address: address,
        old_score: u64,
        new_score: u64,
        risk_level: u8,
        timestamp: u64
    }

    /// Initialize credit scoring system
    public fun initialize(
        account: &signer,
        base_score: u64,
        min_score: u64,
        max_score: u64,
        update_frequency: u64
    ) {
        let _addr = signer::address_of(account);
        
        assert!(
            min_score <= base_score && base_score <= max_score,
            EINVALID_SCORE_RANGE
        );

        assert!(update_frequency > 0, EINVALID_UPDATE_FREQUENCY);

        let config = CreditScoreConfig {
            base_score,
            min_score,
            max_score,
            update_frequency,
            weights: Weights {
                payment_history: 35,
                credit_utilization: 30,
                credit_history: 15,
                new_credit: 10,
                credit_mix: 10
            },
            risk_levels: RiskLevels {
                low_min: 700,
                low_max: 850,
                medium_min: 600,
                medium_max: 699,
                high_min: 300,
                high_max: 599
            }
        };

        move_to(account, config);

        let credit_score = CreditScore {
            score: base_score,
            last_update: timestamp::now_microseconds(),
            factors: CreditFactors {
                payment_history: 100,
                credit_utilization: 0,
                credit_history: 0,
                new_credit: 100,
                credit_mix: 0
            },
            risk_level: calculate_risk_level(base_score),
            history: vector::empty(),
            score_update_events: account::new_event_handle<ScoreUpdateEvent>(account)
        };

        move_to(account, credit_score);
    }

    /// Update credit score
    public fun update_score(
        account: &signer,
        payment_history: u64,
        credit_utilization: u64,
        credit_history: u64,
        new_credit: u64,
        credit_mix: u64
    ) acquires CreditScore, CreditScoreConfig {
        let account_addr = signer::address_of(account);
        
        assert!(exists<CreditScore>(account_addr), ENOT_INITIALIZED);
        
        let credit_score = borrow_global_mut<CreditScore>(account_addr);
        let config = borrow_global<CreditScoreConfig>(account_addr);

        // Validate update frequency
        let current_time = timestamp::now_microseconds();
        assert!(
            current_time >= credit_score.last_update + config.update_frequency,
            EINVALID_UPDATE_FREQUENCY
        );

        // Calculate new credit score
        let old_score = credit_score.score;
        let new_score = calculate_score(
            payment_history,
            credit_utilization,
            credit_history,
            new_credit,
            credit_mix,
            &config.weights
        );

        // Update credit score
        credit_score.score = new_score;
        credit_score.last_update = current_time;
        credit_score.factors = CreditFactors {
            payment_history,
            credit_utilization,
            credit_history,
            new_credit,
            credit_mix
        };

        // Update risk level
        credit_score.risk_level = calculate_risk_level(new_score);

        // Add history entry
        let history_entry = HistoryEntry {
            timestamp: current_time,
            score: new_score,
            factors: *&credit_score.factors
        };
        vector::push_back(&mut credit_score.history, history_entry);

        // If history exceeds 12 months, remove oldest entry
        if (vector::length(&credit_score.history) > 12) {
            vector::remove(&mut credit_score.history, 0);
        };

        // Emit event
        event::emit_event(
            &mut credit_score.score_update_events,
            ScoreUpdateEvent {
                address: account_addr,
                old_score,
                new_score,
                risk_level: credit_score.risk_level,
                timestamp: current_time
            }
        );
    }

    /// Calculate credit score
    fun calculate_score(
        payment_history: u64,
        credit_utilization: u64,
        credit_history: u64,
        new_credit: u64,
        credit_mix: u64,
        weights: &Weights
    ): u64 {
        let score = 0;
        
        // Each factor contributes its weighted portion to the total score
        // For example, if payment_history is 90 and weight is 35%, it contributes 31.5 points
        score = score + payment_history * weights.payment_history;
        score = score + credit_utilization * weights.credit_utilization;
        score = score + credit_history * weights.credit_history;
        score = score + new_credit * weights.new_credit;
        score = score + credit_mix * weights.credit_mix;

        // The total score is normalized by dividing by 100
        score / 100
    }

    /// Calculate risk level
    fun calculate_risk_level(score: u64): u8 {
        if (score >= 700 && score <= 850) {
            0 // low risk
        } else if (score >= 600 && score <= 699) {
            1 // medium risk
        } else {
            2 // high risk
        }
    }

    /// Get credit score
    public fun get_credit_score(addr: address): u64 acquires CreditScore {
        assert!(exists<CreditScore>(addr), ENOT_INITIALIZED);
        borrow_global<CreditScore>(addr).score
    }

    /// Get risk level
    public fun get_risk_level(addr: address): u8 acquires CreditScore {
        assert!(exists<CreditScore>(addr), ENOT_INITIALIZED);
        borrow_global<CreditScore>(addr).risk_level
    }

    /// Get credit factors
    public fun get_credit_factors(addr: address): (u64, u64, u64, u64, u64) acquires CreditScore {
        assert!(exists<CreditScore>(addr), ENOT_INITIALIZED);
        let factors = &borrow_global<CreditScore>(addr).factors;
        (
            factors.payment_history,
            factors.credit_utilization,
            factors.credit_history,
            factors.new_credit,
            factors.credit_mix
        )
    }

    #[test]
    fun test_initialize() acquires CreditScore {
        use aptos_framework::timestamp;

        
        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        let account = account::create_account_for_test(@0x1);
        initialize(&account, 650, 300, 850, 300000);

        let credit_score = borrow_global<CreditScore>(@0x1);
        assert!(credit_score.score == 650, 0);
        assert!(credit_score.risk_level == 1, 0); // medium risk
    }

    #[test]
    fun test_update_score() acquires CreditScore, CreditScoreConfig {
        use aptos_framework::timestamp;

        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        let account = account::create_account_for_test(@0x1);
        initialize(&account, 650, 300, 850, 300000);

        // Set initial timestamp
        timestamp::update_global_time_for_test(1000000);

        // Update credit score with high values
        update_score(&account, 90, 90, 90, 90, 90);

        // Check results
        let credit_score = borrow_global<CreditScore>(@0x1);
        // Expected score calculation based on weights:
        // payment_history: 90 * 35% = 31.5
        // credit_utilization: 90 * 30% = 27
        // credit_history: 90 * 15% = 13.5
        // new_credit: 90 * 10% = 9
        // credit_mix: 90 * 10% = 9
        // Total: 90 points
        let expected_score = 90;
        assert!(credit_score.score == expected_score, 0);
        assert!(vector::length(&credit_score.history) == 1, 0);
        assert!(credit_score.last_update == 1000000, 0);
        assert!(credit_score.risk_level == 2, 0); // high risk (300-599)
    }

    #[test]
    #[expected_failure(abort_code = EINVALID_UPDATE_FREQUENCY)]
    fun test_update_frequency() acquires CreditScore, CreditScoreConfig {
        use aptos_framework::timestamp;

        
        let aptos_framework = account::create_account_for_test(@aptos_framework);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        let account = account::create_account_for_test(@0x1);
        initialize(&account, 650, 300, 850, 300000);

        // First update
        update_score(&account, 90, 80, 70, 60, 50);
        
        // Try second update immediately, should fail
        update_score(&account, 95, 85, 75, 65, 55);
    }
}
