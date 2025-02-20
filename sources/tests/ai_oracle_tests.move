#[test_only]
module aml::ai_oracle_tests {
    use std::signer;

    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aml::ai_oracle;

    // Test accounts
    const ADMIN: address = @0xABCD;
    const ORACLE_SOURCE: address = @0x123;
    const USER: address = @0x456;

    // Test constants
    const REQUEST_TYPE_CREDIT: u8 = 1;

    #[test(aptos_framework = @0x1, admin = @aml)]
    public fun test_initialize(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        ai_oracle::initialize(admin);
    }

    #[test(aptos_framework = @0x1, admin = @aml, source = @0x123)]
    public fun test_add_authorized_source(aptos_framework: &signer, admin: &signer, source: &signer) {
        // Setup
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        ai_oracle::initialize(admin);

        // Add authorized source
        ai_oracle::add_authorized_source(admin, signer::address_of(source));
    }

    #[test(aptos_framework = @0x1, admin = @aml, source = @0x123, user = @0x456)]
    public fun test_request_response_flow(aptos_framework: &signer, admin: &signer, source: &signer, user: &signer) {
        // Setup
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        ai_oracle::initialize(admin);
        ai_oracle::add_authorized_source(admin, signer::address_of(source));

        // Submit request
        let request_data = b"test_request_data";
        let request_id = ai_oracle::submit_request(user, REQUEST_TYPE_CREDIT, request_data);

        // Verify request status
        assert!(ai_oracle::get_request_status(request_id) == 0, 1000); // STATUS_PENDING

        // Submit response
        let response_data = b"test_response_data";
        ai_oracle::submit_response(source, request_id, response_data);

        // Verify response status and data
        assert!(ai_oracle::get_request_status(request_id) == 1, 1001); // STATUS_FULFILLED
        assert!(ai_oracle::has_response(request_id), 1002);

        let (response, source_addr, _) = ai_oracle::get_response(request_id);
        assert!(response == response_data, 1003);
        assert!(source_addr == signer::address_of(source), 1004);
    }

    #[test(aptos_framework = @0x1, admin = @aml, source1 = @0x123, source2 = @0x789)]
    public fun test_multiple_sources(aptos_framework: &signer, admin: &signer, source1: &signer, source2: &signer) {
        // Setup
        account::create_account_for_test(@0x1);
        account::create_account_for_test(@aml);
        timestamp::set_time_has_started_for_testing(aptos_framework);
        ai_oracle::initialize(admin);

        // Add multiple sources
        ai_oracle::add_authorized_source(admin, signer::address_of(source1));
        ai_oracle::add_authorized_source(admin, signer::address_of(source2));

        // Submit request as admin
        let request_data = b"test_request_data";
        let request_id = ai_oracle::submit_request(admin, REQUEST_TYPE_CREDIT, request_data);

        // Both sources can submit responses
        let response_data1 = b"response_from_source1";
        ai_oracle::submit_response(source1, request_id, response_data1);

        // Verify response
        let (response, source_addr, _) = ai_oracle::get_response(request_id);
        assert!(response == response_data1, 1000);
        assert!(source_addr == signer::address_of(source1), 1001);
    }
}
