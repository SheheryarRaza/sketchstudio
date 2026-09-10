---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet.

### How to Ask Questions in Each Round:
1. **Always use the interactive `ask_question` tool** whenever questions have discrete options or choices to pick from.
2. For each question:
   - Provide concrete, structured options where the first option is prefixed with **"(Recommended)"**.
   - Provide clear analysis and context in the question body: explain **industry standards / best practices**, highlight **what the user is doing right**, and constructively point out **potential pitfalls or architectural risks (what might go wrong or what they might be doing sub-optimally)**.
3. Only ask for manual written answers (open text) when the space of possibilities is truly unique to the user's domain/intent and Gemini cannot propose sensible concrete choices.
4. When calling `ask_question`, populate all frontier questions for that round into the `questions` array.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them via `ask_question` and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
