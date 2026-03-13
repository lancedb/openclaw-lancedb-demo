# Dungeon Buddy: OpenClaw + Memory LanceDB Pro Demo

This is a tiny, reproducible project that demonstrates how to use the [memory-lancedb-pro](https://github.com/CortexReach/memory-lancedb-pro) plugin with [OpenClaw](https://github.com/openclaw/openclaw).

The following sequence of steps are demonstrated:
- an agent writes memory in one session,
- memory persists locally on disk,
- a later session recalls the right facts from LanceDB,
- the agent behavior is conditioned on the recalled memory.

The goal is to demonstrate how simple it is to use LanceDB to create a local-first memory-layer pattern for OpenClaw in a way that you can get started in just a few minutes. This demo uses OpenAI embeddings and LLMs, but you can also do it with a locally-hosted open source embedding model and LLM.

## Steps

1. `session1` simulates an OpenClaw memory-write tool.
2. Memory is stored in local LanceDB files under `demo-memory-lancedb/`.
3. In a fresh TUI session, OpenClaw recalls the right facts via `memory-lancedb-pro` auto-recall.
4. OpenClaw runtime config uses:
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
npm run reset
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
          "dbPath": "~/code/openclaw-lancedb-demo/demo-memory-lancedb",
          "autoCapture": true,
          "autoRecall": true,
          "smartExtraction": true,
          "extractMinMessages": 2,
          "llm": {
            "apiKey": "${OPENAI_API_KEY}",
            "baseURL": "https://api.openai.com/v1",
            "model": "gpt-4.1"
          },
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
cd ~/code/openclaw-lancedb-demo
```

## 5. Activate memory-lancedb-pro and trust it explicitly

The memory plugin for LanceDB needs to be explicitly allowed for it to register at runtime:

```bash
openclaw config set plugins.entries.memory-lancedb-pro.enabled true
openclaw config set plugins.allow '["memory-lancedb-pro"]'
openclaw config set plugins.slots.memory memory-lancedb-pro
```

Run this command to verify that the `memory-lancedb-pro` plugin is enabled.
```bash
openclaw config get plugins.slots.memory
# Returns: memory-lancedb-pro
```

## 6. Ensure demo LanceDB path is writable

The agent needs to be able to write to the demo LanceDB path used by both `npm run repro` and the memory plugin.

```bash
mkdir -p ~/code/openclaw-lancedb-demo/demo-memory-lancedb
chmod -R u+rwX ~/code/openclaw-lancedb-demo/demo-memory-lancedb
```

## 7. Validate setup

Once you run the above commands, you can validate the setup with the following set of commands.

```bash
openclaw config validate
openclaw config get agents.defaults.model.primary
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

## 9. Run the demo from TUI

In another terminal, run the TUI:

```bash
cd ~/code/openclaw-lancedb-demo
openclaw tui
```

Paste these blocks one after the other into the OpenClaw TUI.
Ensure that you use absolute paths to your project in your local machine.
`npm run repro` now clears rows in-place (it no longer deletes `demo-memory-lancedb/`).

First, run session 1:

```text
Run this command sequence exactly and print the output:

cd /Users/prrao/code/openclaw-lancedb-demo
npm install
npm run repro
```

Important: `memory-lancedb-pro` opens the LanceDB table when the gateway starts.  
If you run `npm run repro` after gateway startup, restart the gateway before asking recall questions so it reloads the latest rows.

Internally, the `session1.ts` script generates the following text fields and its metadata.
```ts
const captures = [
  {
    category: "entity",
    text: "Player class is elf healer who keeps the team alive.",
    importance: 0.95,
  },
  {
    category: "preference",
    text: "Player hates spiders and avoids spider caves.",
    importance: 0.9,
  },
  {
    category: "preference",
    text: "Player loves fire spells and explosive battle plans.",
    importance: 0.85,
  },
  {
    category: "fact",
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
 - Reset ran: cleared previous memory rows in-place.  
 - Session 1 executed:                                
     - Created new dataset at                         
 demo-memory-lancedb/memories.lance.                  
     - Captured long-term memory:                     
           - Saved: [entity] Player class is elf      
 healer who keeps the team alive.                     
           - Saved: [preference] Player hates spiders 
 and avoids spider caves.                             
           - Saved: [preference] Player loves fire    
 spells and explosive battle plans.                   
           - Saved: [fact] Inventory has one          
 phoenix ember and three healing potions.             
     - Session 1 complete. Memory written to          
 demo-memory-lancedb/.                                
```

Now, let's simulate a scenario where you come back another day for a new session. Close both the gateway and the TUI.
- Open the gateway in one terminal: `openclaw gateway run --force`
- Open a fresh TUI in another terminal: `openclaw tui`

Inside the fresh TUI, enter and run the following:

```
 What powers does the player have?                          
```
```
Based on the available memories, the player is an elf      
healer who keeps the team alive. This suggests their       
primary powers are healing and supporting teammates, with  
a strong affinity for fire spells and explosive battle     
tactics. 
```

The response obtains the top 3 memories from the long-term memory store in context,
and this provides enough information to the agent to provide a reasonable response.

Let's try another question:
```
What does the player like?
```
```
The player likes fire spells and explosive battle plans.
```
As can be seen, it correctly retrieves the player's likes as well from long-term memory.

## 10. Validate the source of the memories

How do we know that the memories came from LanceDB? Each time a question is asked, the most relevant memories are injected into the context for the main agent, and the gateway logs confirm this as follows:

```
[gateway] memory-lancedb-pro: injecting 3 memories into context for agent main
```

Each time a new comment is entered in the TUI, the agent obtains the top 3 most similar memories to the text in context, and is able to choose whether or not it's useful to respond.

> [!NOTE]
> Agents are pretty bad at self-describing the sources of their own knowledge, so it's recommended to only trust telemetry, not agent self-description to know where the information came from. 

Have fun using LanceDB and its memory plugins with OpenClaw! 🦞
