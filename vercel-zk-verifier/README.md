# ZK-SNARK Verification Microservice

A lightweight Vercel serverless function for cryptographically verifying Groth16 zero-knowledge proofs using snarkjs.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- [Vercel Account](https://vercel.com/signup) (free)
- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`

### Deployment Steps

1. **Navigate to this directory:**
   ```bash
   cd vercel-zk-verifier
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Login to Vercel:**
   ```bash
   vercel login
   ```

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

5. **Copy your deployment URL** (e.g., `https://zk-snark-verifier.vercel.app`)

### Testing Your Deployment

```bash
curl -X POST https://your-vercel-app.vercel.app/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "proof": {
      "pi_a": ["1", "2", "1"],
      "pi_b": [["1", "2"], ["3", "4"], ["1", "0"]],
      "pi_c": ["5", "6", "1"],
      "protocol": "groth16",
      "curve": "bn128"
    },
    "publicSignals": ["10000", "12345"],
    "vkey": { /* your verification key */ }
  }'
```

## 🔗 Integration with Supabase

After deployment, update your Supabase edge function environment variable:

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add secret: `VERCEL_VERIFY_URL` = `https://your-vercel-app.vercel.app/api/verify`

The `verify-zk-proof` edge function will automatically use this endpoint.

## 📊 API Endpoint

**POST** `/api/verify`

**Request Body:**
```json
{
  "proof": {
    "pi_a": ["...", "...", "1"],
    "pi_b": [["...", "..."], ["...", "..."], ["1", "0"]],
    "pi_c": ["...", "...", "1"],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": ["threshold", "commitment"],
  "vkey": { /* verification key object */ }
}
```

**Response (Success):**
```json
{
  "verified": true,
  "timestamp": "2025-11-08T15:30:00.000Z",
  "publicSignals": {
    "threshold": "10000",
    "commitment": "12345..."
  }
}
```

**Response (Failed):**
```json
{
  "verified": false,
  "error": "Invalid proof"
}
```

## 🛠️ Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Install dependencies
npm install

# Run locally
vercel dev
```

Your local endpoint will be available at: `http://localhost:3000/api/verify`

## 📦 What This Does

- ✅ Full cryptographic Groth16 verification using snarkjs
- ✅ Validates proof structure before verification
- ✅ Returns detailed verification results
- ✅ CORS-enabled for Supabase edge functions
- ✅ Fast (~500ms verification time)
- ✅ Serverless (no infrastructure management)

## 🔒 Security Notes

- This endpoint is public but safe—proofs are meant to be verified publicly
- No sensitive data is exposed in verification
- Each verification is stateless and isolated
- Vercel provides DDoS protection and rate limiting

## 💰 Cost

**Vercel Free Tier:**
- ✅ 100GB bandwidth/month
- ✅ Unlimited serverless function invocations
- ✅ 100 GB-hours compute time

This is more than enough for thousands of proof verifications per month.

## 🐛 Troubleshooting

**Error: "Worker is not defined"**
- ✅ Fixed! This microservice runs on Node.js (not Deno), so Web Workers work perfectly.

**Slow verification (>5 seconds)**
- Check your Vercel function region matches your users' location
- Increase memory in `vercel.json` if needed

**Deployment fails**
- Make sure you're logged into Vercel: `vercel login`
- Check Node.js version: `node -v` (must be ≥18)

## 📝 Next Steps After Deployment

1. ✅ Deploy this service to Vercel
2. ✅ Copy your deployment URL
3. ✅ Add URL as a Supabase secret (see instructions above)
4. ✅ Test with a real proof from your app
5. ✅ Monitor usage in Vercel dashboard

---

**Need help?** Check [Vercel's documentation](https://vercel.com/docs) or the Supabase integration guide.
