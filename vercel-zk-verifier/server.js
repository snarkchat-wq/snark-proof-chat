const express = require('express');
const snarkjs = require('snarkjs');

const app = express();

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Healthcheck
app.get('/api/verify', (_req, res) => {
  res.status(200).json({ status: 'ok', runtime: 'express', timestamp: new Date().toISOString() });
});

// Verify endpoint
app.post('/api/verify', async (req, res) => {
  try {
    const { proof, publicSignals, vkey } = req.body || {};

    if (!proof || !publicSignals || !vkey) {
      return res.status(400).json({ error: 'Missing required fields: proof, publicSignals, or vkey' });
    }
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      return res.status(400).json({ error: 'Invalid proof structure' });
    }

    console.log('🔐 [Express] Verifying Groth16 proof...');
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    console.log('Verification result:', isValid ? '✅ VALID' : '❌ INVALID');

    return res.status(200).json({
      verified: Boolean(isValid),
      timestamp: new Date().toISOString(),
      publicSignals: {
        threshold: publicSignals[0],
        commitment: publicSignals[1],
      },
    });
  } catch (error) {
    console.error('❌ [Express] Verification error:', error);
    return res.status(500).json({ verified: false, error: error.message || 'Verification failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Verifier listening on port ${PORT}`);
});
