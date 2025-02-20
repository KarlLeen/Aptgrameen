#[test_only]
module aml::integrated_dao_tests {
    use std::signer;
    use std::vector;

    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aml::integrated_dao;

    // Test accounts
    const ADMIN: address = @0xABCD;
    const MEMBER1: address = @0x123;
    const MEMBER2: address = @0x456;
    const MEMBER3: address = @0x789;

    // Test error codes
    const ETEST_FAILED: u64 = 1000;

    // Proposal types for testing
    const PROPOSAL_TYPE_RATE_CHANGE: u8 = 1;
    const PROPOSAL_TYPE_MEMBER_ADD: u8 = 2;

    #[test(aptos_framework = @0x1, admin = @aml)]
    public fun test_initialize(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_dao::initialize(admin);
    }

    #[test(aptos_framework = @0x1, admin = @aml, member1 = @0x123)]
    public fun test_create_proposal(aptos_framework: &signer, admin: &signer, member1: &signer) {
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        account::create_account_for_test(@0x123);
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_dao::initialize(admin);

        // Add member1 to DAO
        let member1_addr = signer::address_of(member1);
        integrated_dao::add_member(admin, member1_addr);

        // Create rate change proposal
        let content = b"500"; // 5% interest rate
        integrated_dao::create_proposal(member1, PROPOSAL_TYPE_RATE_CHANGE, content);
    }

    #[test(aptos_framework = @0x1, admin = @aml, member1 = @0x123, member2 = @0x456, member3 = @0x789)]
    public fun test_vote_and_execute_proposal(
        aptos_framework: &signer,
        admin: &signer,
        member1: &signer,
        member2: &signer,
        member3: &signer
    ) {
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        account::create_account_for_test(@0x123);
        account::create_account_for_test(@0x456);
        account::create_account_for_test(@0x789);
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_dao::initialize(admin);

        // Add members to DAO
        let member1_addr = signer::address_of(member1);
        let member2_addr = signer::address_of(member2);
        let member3_addr = signer::address_of(member3);
        integrated_dao::add_member(admin, member1_addr);
        integrated_dao::add_member(admin, member2_addr);
        integrated_dao::add_member(admin, member3_addr);

        // Create proposal
        let content = vector::empty<u8>();
        vector::push_back(&mut content, 5u8); // 5% interest rate
        integrated_dao::create_proposal(member1, PROPOSAL_TYPE_RATE_CHANGE, content);

        // Vote on proposal
        integrated_dao::vote_on_proposal(member1, member1_addr, true);
        integrated_dao::vote_on_proposal(member2, member1_addr, true);
        integrated_dao::vote_on_proposal(member3, member1_addr, true);

        // Advance time past time lock
        timestamp::fast_forward_seconds(86401); // 24 hours + 1 second

        // Execute proposal
        integrated_dao::execute_proposal(member1, member1_addr);
    }

    #[test(aptos_framework = @0x1, admin = @aml, member1 = @0x123, member2 = @0x456)]
    public fun test_member_management(aptos_framework: &signer, admin: &signer, member1: &signer, member2: &signer) {
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        account::create_account_for_test(@0x123);
        account::create_account_for_test(@0x456);
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_dao::initialize(admin);

        // Add member1
        let member1_addr = signer::address_of(member1);
        integrated_dao::add_member(admin, member1_addr);

        // Create proposal to add member2
        let member2_addr = signer::address_of(member2);
        let content = b"add_member";
        integrated_dao::create_proposal(member1, PROPOSAL_TYPE_MEMBER_ADD, content);

        // Vote and execute
        integrated_dao::vote_on_proposal(member1, member1_addr, true);
        timestamp::fast_forward_seconds(86401);
        integrated_dao::execute_proposal(member1, member1_addr);
    }
}
