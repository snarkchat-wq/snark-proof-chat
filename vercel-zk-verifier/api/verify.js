const snarkjs = require('snarkjs');

/**
 * Vercel Serverless Function for ZK-SNARK Proof Verification
 * Supports Groth16 proofs with full cryptographic verification
 */
module.exports = async (req, res) => {
  // Enable CORS for Supabase edge functions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { proof, publicSignals, vkey } = req.body;

    // Validate inputs
    if (!proof || !publicSignals || !vkey) {
      return res.status(400).json({ 
        error: 'Missing required fields: proof, publicSignals, or vkey' 
      });
    }

    // Validate proof structure
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      return res.status(400).json({ 
        error: 'Invalid proof structure' 
      });
    }

    console.log('🔐 Verifying Groth16 proof...');
    console.log('Public signals:', publicSignals);

    // Perform full cryptographic verification using snarkjs
    const isValid = await snarkjs.groth16.verify(
      vkey,
      publicSignals,
      proof
    );

    console.log('Verification result:', isValid ? '✅ VALID' : '❌ INVALID');

    return res.status(200).json({
      verified: isValid,
      timestamp: new Date().toISOString(),
      publicSignals: {
        threshold: publicSignals[0],
        commitment: publicSignals[1]
      }
    });

  } catch (error) {
    console.error('❌ Verification error:', error);
    return res.status(500).json({
      verified: false,
      error: error.message || 'Verification failed'
    });
  }
};
