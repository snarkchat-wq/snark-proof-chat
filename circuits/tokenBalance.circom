pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Token Balance ZK Circuit
 * Proves: actualBalance >= threshold
 * Without revealing: actualBalance
 * 
 * Private inputs:
 *   - actualBalance: The user's real token balance
 *   - salt: Random value for commitment
 * 
 * Public inputs:
 *   - threshold: Minimum required balance (e.g., 10000)
 *   - commitment: Poseidon(actualBalance, salt) - proves same balance used
 */
template TokenBalance() {
    // Private inputs
    signal input actualBalance;
    signal input salt;
    
    // Public inputs
    signal input threshold;
    signal input commitment;
    
    // Output signal (1 if valid, constraint fails otherwise)
    signal output valid;
    
    // 1. Verify the commitment matches Poseidon(actualBalance, salt)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== actualBalance;
    hasher.inputs[1] <== salt;
    commitment === hasher.out;
    
    // 2. Check that actualBalance >= threshold
    component gte = GreaterEqThan(64); // Support balances up to 2^64
    gte.in[0] <== actualBalance;
    gte.in[1] <== threshold;
    
    // 3. Output must be 1 (true)
    gte.out === 1;
    valid <== 1;
}

component main {public [threshold, commitment]} = TokenBalance();
