#[test_only]
module aml::integrated_credit_sbt_tests {
    use std::signer;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aml::integrated_credit_sbt;
    use aml::ai_oracle;

    // Test accounts
    const ADMIN: address = @0xABCD;
    const USER1: address = @0x123;
    const USER2: address = @0x456;
    const USER3: address = @0x789;
    const USER4: address = @0x321;
    const USER5: address = @0x654;

    // Test error codes
    const ETEST_FAILED: u64 = 1000;

    #[test(aptos_framework = @0x1, admin = @aml)]
    public fun test_initialize(aptos_framework: &signer, admin: &signer) {
        // Setup test environment
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_credit_sbt::initialize(admin);
        ai_oracle::initialize(admin);
    }

    #[test(aptos_framework = @0x1, admin = @aml, user1 = @0x123)]
    public fun test_submit_interview_data(aptos_framework: &signer, admin: &signer, user1: &signer) {
        // Setup
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_credit_sbt::initialize(admin);
        ai_oracle::initialize(admin);

        // Create test data
        let encrypted_data = x"68656c6c6f776f726c64"; // "helloworld" in hex
        let public_key = x"7013b6ed7dde3cfb1251db1b04ae9cd7853470284085693590a75def645a926d";
        let signature = x"c9d4b7de7b6ff50f50fb4dce0857b9c0e0e6bb7e1a0edac8eecade54c62fe3b4c9d4b7de7b6ff50f50fb4dce0857b9c0e0e6bb7e1a0edac8eecade54c62fe3b4";

        // Submit interview data
        integrated_credit_sbt::submit_interview_data(user1, encrypted_data, signature, public_key);
    }

    #[test(aptos_framework = @0x1, admin = @aml, user1 = @0x123)]
    public fun test_process_assessment(aptos_framework: &signer, admin: &signer, user1: &signer) {
        // Setup
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_credit_sbt::initialize(admin);
        ai_oracle::initialize(admin);

        // Submit interview data first
        let encrypted_data = x"68656c6c6f776f726c64"; // "helloworld" in hex
        let public_key = x"7013b6ed7dde3cfb1251db1b04ae9cd7853470284085693590a75def645a926d";
        let signature = x"c9d4b7de7b6ff50f50fb4dce0857b9c0e0e6bb7e1a0edac8eecade54c62fe3b4c9d4b7de7b6ff50f50fb4dce0857b9c0e0e6bb7e1a0edac8eecade54c62fe3b4";
        integrated_credit_sbt::submit_interview_data(user1, encrypted_data, signature, public_key);

        // Process assessment
        let assessment_result = b"test_assessment_result";
        integrated_credit_sbt::process_assessment(admin, signer::address_of(user1), assessment_result);
    }

    #[test(aptos_framework = @0x1, admin = @aml, user1 = @0x123, user2 = @0x456, user3 = @0x789, user4 = @0x321, user5 = @0x654)]
    public fun test_create_group(
        aptos_framework: &signer,
        admin: &signer,
        user1: &signer,
        user2: &signer,
        user3: &signer,
        user4: &signer,
        user5: &signer
    ) {
        // Setup
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        integrated_credit_sbt::initialize(admin);
        ai_oracle::initialize(admin);

        // Submit interview data and process assessments for each user
        let encrypted_data = x"68656c6c6f776f726c64"; // "helloworld" in hex
        let public_key = x"7013b6ed7dde3cfb1251db1b04ae9cd7853470284085693590a75def645a926d";
        let signature = x"c9d4b7de7b6ff50f50fb4dce0857b9c0e0e6bb7e1a0edac8eecade54c62fe3b4c9d4b7de7b6ff50f50fb4dce0857b9c0e0e6bb7e1a0edac8eecade54c62fe3b4";
        
        integrated_credit_sbt::submit_interview_data(user1, encrypted_data, signature, public_key);
        integrated_credit_sbt::submit_interview_data(user2, encrypted_data, signature, public_key);
        integrated_credit_sbt::submit_interview_data(user3, encrypted_data, signature, public_key);
        integrated_credit_sbt::submit_interview_data(user4, encrypted_data, signature, public_key);
        integrated_credit_sbt::submit_interview_data(user5, encrypted_data, signature, public_key);
        
        let assessment_result = b"test_assessment_result";
        integrated_credit_sbt::process_assessment(admin, signer::address_of(user1), assessment_result);
        integrated_credit_sbt::process_assessment(admin, signer::address_of(user2), assessment_result);
        integrated_credit_sbt::process_assessment(admin, signer::address_of(user3), assessment_result);
        integrated_credit_sbt::process_assessment(admin, signer::address_of(user4), assessment_result);
        integrated_credit_sbt::process_assessment(admin, signer::address_of(user5), assessment_result);

        // Create group
        let members = vector[
            signer::address_of(user1),
            signer::address_of(user2),
            signer::address_of(user3),
            signer::address_of(user4),
            signer::address_of(user5)
        ];
        let group_id = b"test_group";
        integrated_credit_sbt::create_group(admin, members, group_id);
    }
}
