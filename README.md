# Dungeon Buddy: OpenClaw + LanceDB Memory Pro Demo

This is a tiny, reproducible project that demonstrates how to use the [memory-lancedb-pro](https://github.com/CortexReach/memory-lancedb-pro) plugin with [OpenClaw](https://github.com/openclaw/openclaw).

The following sequence of steps are demonstrated:
- an agent writes memory in one session,
- memory persists locally on disk,
- a later session recalls the right facts,
- the agent behavior is conditioned on the recalled memory.

The goal is to demonstrate how simple it is to use LanceDB to create a local-first memory-layer pattern for OpenClaw in a way that you can get started in just a few minutes. This demo uses OpenAI embeddings and LLMs, but you can also do it with a locally-hosted open source embedding model and LLM.

## Steps

1. `session1` simulates an OpenClaw memory-write tool.
2. Memory is stored in local LanceDB files under `demo-memory-lancedb/`.
3. `session2` simulates a new OpenClaw session and recalls the most relevant memories based on similarity using vector search.
4. A quest plan is generated from recalled memory (class, dislikes, combat style, inventory).
5. OpenClaw runtime config uses:
   - generation model: `openai/gpt-4.1` (OpenAI)
   - memory plugin: `memory-lancedb-pro` (CortexReach)
   - embedding model: `text-embedding-3-small` (OpenAI)

## Prerequisites

- OpenClaw CLI installed
- Node.js + npm installed
- A valid OpenAI API key

Set your OpenAI key in your shell:

```bash
export OPENAI_API_KEY="sk-your-real-key"
```

### (Optional) Backup

If needed, you can backup your existing OpenClaw setup before running this tutorial.

```bash
openclaw backup create
```

## 1. Clean-slate reset

This removes previous OpenClaw config/state/workspace so old plugin/config drift cannot break setup.

```bash
openclaw reset --scope full --yes --non-interactive
```

## 2. Write bootstrap config

Write `~/.openclaw/openclaw.json` with these exact contents (copy-paste the contents of this snippet into a terminal and press enter).

```bash
mkdir -p ~/.openclaw
cat > ~/.openclaw/openclaw.json <<'JSON'
{
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "auth": { "mode": "none" }
  },
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}"
  },
  "agents": {
    "defaults": {
      "sandbox": { "mode": "off" },
      "model": { "primary": "openai/gpt-4.1" },
      "models": {
        "openai/gpt-4.1": {}
      }
    }
  },
  "plugins": {
    "slots": {
      "memory": "memory-core"
    },
    "entries": {
      "memory-lancedb-pro": {
        "enabled": true,
        "config": {
          "embedding": {
            "provider": "openai-compatible",
            "apiKey": "${OPENAI_API_KEY}",
            "baseURL": "https://api.openai.com/v1",
            "model": "text-embedding-3-small",
            "dimensions": 1536
          },
          "autoCapture": true,
          "autoRecall": true,
          "sessionMemory": { "enabled": false }
        }
      }
    }
  }
}
JSON
```

## 3. Install `lancedb-memory-pro` plugin

```bash
openclaw plugins install memory-lancedb-pro@beta
```

## 4. Install LanceDB peer dependencies

`@lancedb/lancedb` requires `apache-arrow` as a peer dependency. If it's missing, recall/capture fails at runtime. Install it into the OpenClaw extensions directory as follows:

```bash
cd ~/.openclaw/extensions/memory-lancedb-pro
npm install --no-save apache-arrow@18.1.0
```

## 5. Activate memory-lancedb-pro and trust it explicitly

The memory plugin for LanceDB needs to be explicitly allowed for it to register at runtime:

```bash
openclaw config set plugins.slots.memory memory-lancedb-pro
openclaw config set plugins.allow '["memory-lancedb-pro"]'
```

## 6. Ensure LanceDB path is writable

The agent needs to be able to write to the LanceDB local directory. The following commands make that path writable.

```bash
mkdir -p ~/.openclaw/memory/lancedb-pro
chmod -R u+rwX ~/.openclaw/memory
```

## 7. Validate setup

Once you run the above commands, you can validate the setup with the following set of commands.

```bash
openclaw config validate
openclaw config get agents.defaults.model.primary
openclaw config get plugins.slots.memory
openclaw plugins info memory-lancedb-pro
openclaw plugins doctor
```

It should show something like this:
```
No plugin issues detected.
```

## 8. Start gateway + TUI

Start an OpenClaw gateway and open the TUI to begin conversing with your agent!

In the first terminal, enter the following:

```bash
openclaw gateway run --force
```
This opens a gateway for the OpenClaw TUI.

Then, in another terminal, run the TUI:

```bash
cd /Users/prrao/code/dungeon-buddy
openclaw tui
```

## 9. Run the demo from TUI

Paste these blocks one after the other into the OpenClaw TUI.
Ensure that you use absolute paths to your project in your local machine.

First, run session 1:

```text
Run this exactly and show command outputs:

cd /Users/prrao/code/dungeon-buddy
npm install
npm run repro
```

Internally, the `session1.js` script generates the following text fields and its metadata.
```js
const captures = [
  {
    kind: "profile",
    text: "Player class is elf healer who keeps the team alive.",
    importance: 0.95,
  },
  {
    kind: "preference",
    text: "Player hates spiders and avoids spider caves.",
    importance: 0.9,
  },
  {
    kind: "preference",
    text: "Player loves fire spells and explosive battle plans.",
    importance: 0.85,
  },
  {
    kind: "resource",
    text: "Inventory has one phoenix ember and three healing potions.",
    importance: 0.75,
  },
];
```


The output shows that the first conversation ran and the memories were successfully written to `demo-memory-lancedb/`.
```
Here are the results from running your commands:     
                                                      
 npm install:                                         
 - All packages are up to date.                       
 - 3 packages are looking for funding (npm fund for   
 details).                                            
 - 0 vulnerabilities found.                           
                                                      
 npm run repro:                                       
 - Reset ran: demo-memory-lancedb/ removed.           
 - Session 1 executed:                                
     - Created new dataset at                         
 demo-memory-lancedb/memories.lance.                  
     - Captured long-term memory:                     
           - Saved: [profile] Player class is elf     
 healer who keeps the team alive.                     
           - Saved: [preference] Player hates spiders 
 and avoids spider caves.                             
           - Saved: [preference] Player loves fire    
 spells and explosive battle plans.                   
           - Saved: [resource] Inventory has one      
 phoenix ember and three healing potions.             
     - Session 1 complete. Memory written to          
 demo-memory-lancedb/.                                
```

Next, close the TUI and open a new one (this is similar to how you might come back another day for a new session). In a fresh TUI, enter and run the following:

```
What does the player hate?
```

This uses the past memories and generates an answer based on those memories.

```
The player hates spiders and avoids spider caves.
```

Let's try another question:
```
What does the player like?
```

It correctly retrieves the player's likes as well:
```
The player likes fire spells and explosive battle plans. 
```

## 10. Validate the source of the memories

How do we know the agent is actually recalling these memories from LanceDB?
In the same open TUI, ask your agent the following question:

```
Where did you retrieve the memories from?
```

It should state something like this:
```
 The memories were retrieved from the dataset located 
 at:                                                  
                                                      
 demo-memory-lancedb/memories.lance                   
                                                      
 This dataset was created and written during the      
 earlier reset/session1 step, which saved long-term   
 memory entries (profile, preferences, resources) to  
 this LanceDB file. When you ran npm run session2,    
 the script queried this same file to recall the      
 relevant memories and generate the quest plan. 
```

Our agent is telling us that the memories are located in `demo-memory-lancedb/memories.lance `, which is our LanceDB memory store's location!

Have fun using LanceDB and its memory plugins with OpenClaw! 🦞
