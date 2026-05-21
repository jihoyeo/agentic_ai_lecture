"""The Agent class — an LLM that loops: reason, act, observe.

This is the *finished* version of the agent loop you build step by step in
Lab 3. Labs 4 and 5 import it from here so they can focus on new ideas
(multi-agent, RAG) without re-typing the loop.

The loop is intentionally tiny — that compactness is the lesson of Session 3.
"""
from __future__ import annotations

import json


class Agent:
    """An LLM agent that can call tools in a loop until it has an answer."""

    def __init__(self, llm, schemas, functions, system=None, max_steps=6):
        """
        Args:
            llm:       an LLMClient / MockLLM / ScriptedLLM (anything with
                       generate / generate_with_tools).
            schemas:   list of tool-schema dicts — what the model is shown.
            functions: dict {tool_name: callable} — what actually runs.
            system:    optional system prompt.
            max_steps: safety cap on loop iterations (prevents infinite loops).
        """
        self.llm = llm
        self.schemas = schemas
        self.functions = functions
        self.system = system
        self.max_steps = max_steps

    def _run_tool(self, name, args):
        """Run one tool by name. Errors are returned (not raised) so the
        agent can observe them and recover."""
        if name not in self.functions:
            return {"error": f"unknown tool: {name}"}
        try:
            return self.functions[name](**(args or {}))
        except Exception as exc:  # noqa: BLE001
            return {"error": f"{type(exc).__name__}: {exc}"}

    def run(self, question, verbose=True):
        """Answer `question` by looping: reason -> act -> observe."""
        messages = [{"role": "user", "content": question}]

        for step in range(self.max_steps):
            # --- Reason: the model decides to answer or to call tools ---
            reply = self.llm.generate_with_tools(messages, self.schemas, self.system)

            if not reply.wants_tool:           # no tool wanted -> we are done
                return reply.text

            messages.append({"role": "assistant", "content": reply.text,
                             "tool_calls": reply.tool_calls})

            # --- Act + Observe: run each tool, record the result ---
            for call in reply.tool_calls:
                result = self._run_tool(call.name, call.args)
                if verbose:
                    print(f"  step {step + 1}: {call.name}({call.args})")
                messages.append({
                    "role": "tool", "name": call.name,
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })

        # --- Safety cap reached: ask once more, without tools, so the agent
        #     still gives a best-effort answer instead of a dead end. ---
        return self.llm.generate(messages, self.system).text
