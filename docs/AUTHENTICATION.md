# Authentication Methods - Subscription vs API Key

## Overview

The Squadron supports **dual authentication** for maximum flexibility:

1. **Subscription-based auth** (preferred, higher limits, no per-token cost)
2. **API key auth** (fallback, pay-per-use, good for development)

**Priority:** Subscription → API Key → Unavailable

---

## Why Both Methods?

### Development Phase (API Keys)
- Pay only for what you use
- Low commitment
- Easy to get started
- Sufficient for testing

### Production Phase (Subscription)
- **10x higher limits**
- No per-token costs (flat subscription fee)
- Better economics at scale
- Enterprise reliability

**The orchestrator handles both automatically** - you just configure the credentials you have.

---

## Configuration

### Option 1: API Key Only (Development)

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

**Limits:**
- Claude: 1M tokens/day, $15/M tokens
- Gemini: 2M tokens/day, $2.50/M tokens
- Codex: 500k tokens/day, $20/M tokens

### Option 2: Subscription Only (Production)

```bash
# .env
ANTHROPIC_SUBSCRIPTION_TOKEN=sub-token-xxx
GOOGLE_SUBSCRIPTION_TOKEN=sub-token-xxx
OPENAI_SUBSCRIPTION_TOKEN=sub-token-xxx
```

**Limits:**
- Claude: 10M tokens/day, no per-token cost
- Gemini: 20M tokens/day, no per-token cost
- Codex: 5M tokens/day, no per-token cost

### Option 3: Hybrid (Recommended)

```bash
# .env

# Primary: Subscription (used first)
ANTHROPIC_SUBSCRIPTION_TOKEN=sub-token-xxx
GOOGLE_SUBSCRIPTION_TOKEN=sub-token-xxx
OPENAI_SUBSCRIPTION_TOKEN=sub-token-xxx

# Fallback: API Keys (used if subscription fails)
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

**Benefits:**
- ✅ Use subscription when available (higher limits, no cost)
- ✅ Fallback to API key if subscription issues
- ✅ Maximum reliability

---

## How Authentication Selection Works

```typescript
// Pseudo-code (actual implementation in agent-config.ts)

function selectAuth(agent: 'claude' | 'gemini' | 'codex') {
  // Check for subscription token
  if (hasSubscriptionToken(agent)) {
    console.log(`Using SUBSCRIPTION for ${agent} (10x limits, free per-token)`);
    return {
      method: 'subscription',
      dailyLimit: highLimit, // 10M, 20M, or 5M
      costPerToken: 0
    };
  }
  
  // Fallback to API key
  if (hasApiKey(agent)) {
    console.log(`Using API KEY for ${agent} (standard limits, pay-per-use)`);
    return {
      method: 'api-key',
      dailyLimit: standardLimit, // 1M, 2M, or 500k
      costPerToken: marketRate
    };
  }
  
  // No credentials
  console.error(`${agent} has no valid credentials!`);
  return unavailable;
}
```

---

## Subscription Token Format

### Batch Command Prompt Style

If you're using batch command prompts for AI services, your subscription tokens likely look like:

```bash
# Example formats (actual format depends on your provider)

# Anthropic subscription
ANTHROPIC_SUBSCRIPTION_TOKEN=sk-sub-anthropic-xxxxxxxxxxxxxx

# Google AI subscription  
GOOGLE_SUBSCRIPTION_TOKEN=sub-google-ai-xxxxxxxxxxxxxx

# OpenAI subscription
OPENAI_SUBSCRIPTION_TOKEN=sk-sub-openai-xxxxxxxxxxxxxx

# Or enterprise tokens
ANTHROPIC_SUBSCRIPTION_TOKEN=ent-anthropic-company-xxxxxx
```

**The orchestrator treats these as opaque strings** - it just passes them to the API endpoints.

---

## Migration Workflow

### Step 1: Start with API Keys

```bash
# When first building
ANTHROPIC_API_KEY=sk-ant-dev-xxx
GOOGLE_API_KEY=dev-key-xxx
OPENAI_API_KEY=sk-dev-xxx
```

### Step 2: Add Subscriptions When Profitable

```bash
# Keep API keys, add subscriptions
ANTHROPIC_SUBSCRIPTION_TOKEN=sub-xxx  # ← Add this
ANTHROPIC_API_KEY=sk-ant-dev-xxx      # ← Keep this as fallback

GOOGLE_SUBSCRIPTION_TOKEN=sub-xxx     # ← Add this
GOOGLE_API_KEY=dev-key-xxx            # ← Keep this as fallback
```

**Orchestrator automatically:**
- Uses subscription (higher limits, no per-token cost)
- Falls back to API key if subscription fails
- Logs which auth method is active

### Step 3: Monitor Costs

```typescript
// Get credit status
const status = agentManager.getCreditStatus();

console.log(status);
// {
//   claude: { 
//     authMethod: 'subscription',
//     isSubscription: true,
//     costPerToken: 0,
//     dailyLimit: 10000000,
//     available: true
//   }
// }
```

---

## Cost Comparison

### Scenario: 5M tokens/day usage

**API Key Only:**
```
Claude: 5M tokens × $15/M = $75/day = $2,250/month
Gemini: 5M tokens × $2.50/M = $12.50/day = $375/month
Codex: 5M tokens × $20/M = $100/day = $3,000/month
──────────────────────────────────────────────────
Total: $187.50/day = $5,625/month
```

**Subscription Only:**
```
Claude subscription: ~$100-200/month (flat fee)
Gemini subscription: ~$50-100/month (flat fee)
Codex subscription: ~$200-300/month (flat fee)
──────────────────────────────────────────────────
Total: ~$400-600/month
```

**Savings: ~90%** at scale (5M+ tokens/day)

---

## Startup Cost

```bash
# .env

# PHASE 1: MVP Development (months 1-3)
# Cost: ~$50-100/month
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx

# PHASE 2: Early Users (months 3-6)
# Cost: ~$200-500/month (still API keys)
# Continue with API keys, monitor usage

# PHASE 3: Revenue Generating (month 6+)
# Cost: ~$400-600/month (subscriptions)
# Switch to subscriptions when usage > 1M tokens/day consistently
ANTHROPIC_SUBSCRIPTION_TOKEN=sub-xxx
GOOGLE_SUBSCRIPTION_TOKEN=sub-xxx
OPENAI_SUBSCRIPTION_TOKEN=sub-xxx

# Keep API keys as fallback
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

---

## Custom Endpoints (Enterprise)

Some subscriptions provide custom API endpoints:

```bash
# .env

# Subscription tokens
ANTHROPIC_SUBSCRIPTION_TOKEN=ent-company-xxx
GOOGLE_SUBSCRIPTION_TOKEN=ent-company-xxx
OPENAI_SUBSCRIPTION_TOKEN=ent-company-xxx

# Custom endpoints
ANTHROPIC_ENDPOINT=https://api-enterprise.anthropic.com/v1
GOOGLE_ENDPOINT=https://enterprise.googleapis.com/v1
OPENAI_ENDPOINT=https://api-enterprise.openai.com/v1
```

---

## Troubleshooting

### "Agent has no valid credentials" Warning

**Cause:** Neither subscription token nor API key configured

**Solution:**
```bash
# Add at least one auth method
ANTHROPIC_SUBSCRIPTION_TOKEN=xxx  # Preferred
# OR
ANTHROPIC_API_KEY=sk-ant-xxx      # Fallback
```

### Subscription Not Detected

**Check:**
1. Environment variable name matches exactly
2. Token is not empty/undefined
3. Token doesn't have quotes (unless required)

```bash
# ✅ Correct
ANTHROPIC_SUBSCRIPTION_TOKEN=sub-xxx

# ❌ Wrong
ANTHROPIC_SUBSCRIPTION_TOKEN="sub-xxx"  # Remove quotes
ANTHROPIC_SUBSCRIPTION_TOKEN=           # Empty
```

### Hitting Limits Despite Subscription

**Check:**
1. Subscription is actually active (not expired)
2. Daily limit hasn't been changed in .env
3. Usage is being tracked correctly

```typescript
// Debug usage
const status = agentManager.getCreditStatus();
console.log(status.claude.usageToday);  // Check current usage
console.log(status.claude.dailyLimit);  // Check limit
console.log(status.claude.isSubscription);  // Should be true
```

---

## Best Practices

1. **Start with API keys** - Low commitment, easy to get started

2. **Monitor usage** - Track token consumption daily:
   ```typescript
   const status = agentManager.getCreditStatus();
   // When consistently > 1M tokens/day → Consider subscription
   ```

3. **Add subscriptions when profitable** - Once project generates revenue:
   ```bash
   # Add subscription, keep API key as fallback
   ANTHROPIC_SUBSCRIPTION_TOKEN=sub-xxx
   ANTHROPIC_API_KEY=sk-ant-xxx  # Fallback
   ```

4. **Keep API keys as fallback** - Even with subscriptions:
   - Protects against subscription issues
   - Seamless failover
   - Maximum reliability

5. **Use .env files per environment**:
   ```bash
   .env.development  # API keys only
   .env.staging      # Mix of API keys and subscriptions
   .env.production   # Subscriptions + API key fallbacks
   ```

---

## Summary

**You have complete flexibility:**

- ✅ Start with API keys (low barrier to entry)
- ✅ Add subscriptions when project makes money
- ✅ Keep both for maximum reliability
- ✅ Automatic selection (subscription preferred)
- ✅ Graceful fallback if preferred method fails

**The orchestrator handles everything automatically** - you just configure the credentials you have available.
