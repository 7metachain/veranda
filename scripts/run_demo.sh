#!/usr/bin/env bash
# Walk through the canonical happy path of §4.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
SCENARIOS='["casual_dining","family_interaction"]'

step() { echo ""; echo "=========  $*  ========="; }

step "1. Sign-up (mock Privy session)"
curl -s -X POST "$BACKEND_URL/api/v1/auth/session" \
  -H 'content-type: application/json' \
  -d '{"privy_token":"dev-demo-token-alice"}' | tee /tmp/session.json
ALICE_REAL_WALLET=$(jq -r '.real_wallet' /tmp/session.json)

step "2. Profile creation (mock)"
curl -s -X POST "$BACKEND_URL/api/v1/profile" \
  -H 'content-type: application/json' \
  -d "{
    \"agent_wallet\": \"AliceAgentWallet111111111111111111111111111\",
    \"scenarios\": $SCENARIOS,
    \"audio_uploads\": [\"alice_meal.wav\",\"alice_family.wav\"]
  }" | tee /tmp/profile.json

step "3. Scenario selection persisted"
echo "(client-side; selection sent above)"

step "4. Deposit \$20 USDC"
echo "(frontend signs deposit ix via anchor-client; offline mock here)"

step "5. Anonymous registration"
curl -s -X POST "$BACKEND_URL/api/v1/agent/register" \
  -H 'content-type: application/json' \
  -d '{
    "agent_wallet": "AliceAgentWallet111111111111111111111111111",
    "commitment": "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
    "scenarios": ["casual_dining","family_interaction"],
    "merkle_proof": []
  }' | tee /tmp/register.json

step "6+7. Start matching pipeline"
curl -s -X POST "$BACKEND_URL/api/v1/match/start" \
  -H 'content-type: application/json' \
  -d "{
    \"agent_wallet\": \"AliceAgentWallet111111111111111111111111111\",
    \"scenarios\": $SCENARIOS
  }" | tee /tmp/match.json

SESSION_ID=$(jq -r '.match_session_id' /tmp/match.json)

step "Poll match status"
for i in $(seq 1 40); do
  STATUS=$(curl -s "$BACKEND_URL/api/v1/match/status/$SESSION_ID" | jq -r '.status')
  echo "  status=$STATUS"
  [ "$STATUS" = "complete" ] && break
  sleep 2
done

step "8. Browse candidates"
curl -s "$BACKEND_URL/api/v1/candidates/$SESSION_ID" | tee /tmp/candidates.json

step "9. Disclose candidate #3"
curl -s -X POST "$BACKEND_URL/api/v1/candidates/$SESSION_ID/disclose/3" \
  -H 'content-type: application/json' \
  -d '{"tx_signature":"DEV_TX_SIGNATURE_PLACEHOLDER"}' | tee /tmp/disclosure.json

step "10. Trigger ceremony"
curl -s -X POST "$BACKEND_URL/api/v1/ceremony/trigger" \
  -H 'content-type: application/json' \
  -d '{"candidate_agent_wallet":"VerandaCandidateAgent11111111111111111111111"}' \
  | tee /tmp/ceremony.json

echo ""
echo "✅ Demo complete. Artifacts in /tmp/{session,profile,register,match,candidates,disclosure,ceremony}.json"
