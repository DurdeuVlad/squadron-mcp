# Quick Start - Using Global CLI Authentication

## You're Already Logged In! 🎉

If you can run these commands in your terminal:

```powershell
claude      # Opens Claude interactive prompt
gemini      # Opens Gemini interactive prompt  
codex       # Opens Codex/OpenAI interactive prompt
```

**Then you don't need to configure anything!** The MCP Agent Orchestrator will automatically detect your existing login sessions.

---

## How It Works

When you run `claude`, `gemini`, or `codex` in your terminal, those CLI tools use authentication credentials stored on your computer:

**Windows:**
```
C:\Users\YourName\AppData\Roaming\anthropic\config.json
C:\Users\YourName\AppData\Roaming\google-ai\credentials.json
C:\Users\YourName\AppData\Roaming\openai\config.json
```

**Linux/Mac:**
```
~/.anthropic/config.json
~/.config/google-ai/credentials.json
~/.openai/config.json
```

The MCP Agent Orchestrator **reads these same files** - no duplication needed!

---

## Authentication Priority

The orchestrator checks in this order:

```
1. Global CLI Login (your existing session)
   ↓ If not found
2. Subscription Token (from .env)
   ↓ If not found
3. API Key (from .env)
   ↓ If not found
❌ Agent unavailable
```

**Since you're already logged in globally, it will use that (option 1).** ✅

---

## Verification

Start the orchestrator and check the authentication status:

```powershell
cd c:\Users\User\Documents\Github\mcp-agent-orchestrator
npm run dev
```

You should see:

```
🔐 AUTHENTICATION STATUS
============================================================
🌐 CLAUDE: GLOBAL CLI (logged in) (10.0M tokens/day, FREE)
🌐 GEMINI: GLOBAL CLI (logged in) (20.0M tokens/day, FREE)
🌐 CODEX: GLOBAL CLI (logged in) (5.0M tokens/day, FREE)
============================================================
```

**If you see 🌐 GLOBAL CLI** → You're using your existing login! No .env needed.

---

## Benefits of Global CLI Auth

- ✅ **No configuration needed** - Uses your existing login
- ✅ **Highest limits** - Same as subscription (10M, 20M, 5M tokens/day)
- ✅ **No per-token cost** - Flat subscription fee (if you have one)
- ✅ **Most convenient** - Already set up when you logged in

---

## When to Use .env Authentication

**You only need to add keys to .env if:**

1. **You're NOT logged in globally** (can't run `claude`, `gemini`, `codex` in terminal)
2. **You want to use different credentials** than your global login
3. **You're deploying to a server** without global CLI login
4. **You need API keys specifically** for pay-per-use billing

---

## If You're NOT Logged In Globally

### Login Now (Easiest Option)

```powershell
# Claude
claude auth login
# Follow the browser login flow

# Gemini/Google AI
gcloud auth application-default login
# Or: google-ai auth login (if using Google AI CLI)

# Codex/OpenAI
openai auth login
# Or: set OPENAI_API_KEY in your system environment
```

After login, restart the orchestrator - it will auto-detect your credentials.

### Alternative: Use API Keys in .env

If you prefer not to login globally, add to `.env`:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-google-api-key-here
OPENAI_API_KEY=sk-your-openai-key-here
```

The orchestrator will use these instead.

---

## FAQ

**Q: Do I need to add anything to .env?**  
A: No! If you're already logged in globally, the orchestrator auto-detects it.

**Q: How do I know if I'm logged in globally?**  
A: Open PowerShell and run `claude`. If it opens an interactive prompt, you're logged in.

**Q: What if I want to use different credentials for the orchestrator?**  
A: Add API keys or subscription tokens to `.env` - they take priority over global login (if explicitly set).

**Q: Can I use global login for some agents and .env for others?**  
A: Yes! The orchestrator checks each agent independently. Mix and match as needed.

**Q: What if my global login expires?**  
A: Just run `claude auth login` again. The orchestrator will automatically use the new session.

**Q: Does this work on Windows?**  
A: Yes! The orchestrator checks both Windows paths (`AppData\Roaming`) and Unix paths (`~/.config`).

---

## Summary

**If you can run `claude`, `gemini`, `codex` in your terminal:**
- ✅ You're ready to use the orchestrator immediately
- ✅ No .env configuration needed
- ✅ Highest limits and no per-token cost
- ✅ Just run `npm run dev` and start using it

**The orchestrator automatically uses your existing login sessions.** Nothing to configure! 🎉
