"""Provider-agnostic LLM client for the Agentic AI workshop.

You do NOT need to read every line of this file. What matters is the small
public interface that every lab uses:

    from common.llm import LLMClient

    llm = LLMClient()                       # auto-detects your API key
    reply = llm.generate("Hello!")          # -> LLMResponse
    print(reply.text)

    reply = llm.generate_with_tools(messages, tools)   # function calling
    for call in reply.tool_calls:
        print(call.name, call.args)

WHY THIS FILE EXISTS
--------------------
Real agent codebases never call a single vendor's SDK directly everywhere.
They wrap it once, behind one interface, so the rest of the code does not
care which provider is used. This mirrors `agentic/llm.py` in the DTUMOS
research project, which hides Gemini / Claude / OpenAI behind one wrapper.

If no API key is found, this client transparently falls back to a `MockLLM`
so the agent loop still runs end-to-end (great for offline practice and for
the deterministic testing covered in Session 4).
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

try:  # load GEMINI_API_KEY etc. from a local .env file, if present
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass


# ===========================================================================
# Public data types — these are what the labs work with.
# ===========================================================================

@dataclass
class ToolCall:
    """A request, made by the model, to run one tool with these arguments."""

    name: str
    args: dict
    id: str = "call_0"


@dataclass
class LLMResponse:
    """A normalized reply from any LLM backend.

    Either `text` (a plain answer) or `tool_calls` (the model wants to use
    tools) will be populated — sometimes both.
    """

    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)

    @property
    def wants_tool(self) -> bool:
        """True when the model asked to call at least one tool."""
        return len(self.tool_calls) > 0


def as_messages(messages) -> list[dict]:
    """Accept a plain string OR a list of message dicts; always return a list.

    A message dict looks like one of:
        {"role": "user",      "content": "..."}
        {"role": "assistant", "content": "...", "tool_calls": [ToolCall, ...]}
        {"role": "tool",      "name": "...", "content": "<result>"}
    """
    if isinstance(messages, str):
        return [{"role": "user", "content": messages}]
    return list(messages)


# ===========================================================================
# LLMClient — the front door. Pick a backend, expose two methods.
# ===========================================================================

class LLMClient:
    """One client for the whole workshop. Defaults to free-tier Gemini."""

    def __init__(self, provider=None, model=None, api_key=None, verbose=True):
        self.provider = (provider or os.getenv("LLM_PROVIDER", "gemini")).lower()
        self.model = model or os.getenv("LLM_MODEL", "gemini-2.5-flash")
        self._backend = self._make_backend(api_key, verbose)

    def _make_backend(self, api_key, verbose):
        """Use a real provider if a key exists, otherwise fall back to mock."""
        if self.provider == "gemini":
            key = api_key or os.getenv("GEMINI_API_KEY")
            if key and key != "your-key-here":
                try:
                    backend = _GeminiBackend(key, self.model)
                    if verbose:
                        print(f"[LLMClient] Using Gemini ({self.model}).")
                    return backend
                except Exception as exc:  # noqa: BLE001
                    if verbose:
                        print(f"[LLMClient] Gemini init failed ({exc}); using MockLLM.")
        # (To add Claude or OpenAI: write a backend with the same `generate`
        #  signature and select it here — the labs would not change at all.)
        if verbose:
            print("[LLMClient] No API key found — using MockLLM. "
                  "Set GEMINI_API_KEY in .env for real responses.")
        return MockLLM()

    @property
    def is_mock(self) -> bool:
        """True when running without a real API key."""
        return isinstance(self._backend, (MockLLM, ScriptedLLM))

    def generate(self, messages, system=None) -> LLMResponse:
        """Ask the model for a plain text reply (no tools)."""
        return self._backend.generate(as_messages(messages), system, None)

    def generate_with_tools(self, messages, tools, system=None) -> LLMResponse:
        """Ask the model — it may reply with text or with tool calls.

        `tools` is a list of tool-schema dicts (see common/tools.py).
        """
        return self._backend.generate(as_messages(messages), system, tools)


# ===========================================================================
# Internals below — skim only. The labs never touch these directly.
# ===========================================================================

class _GeminiBackend:
    """Wraps the google-genai SDK. Manual (not automatic) function calling."""

    def __init__(self, api_key, model):
        from google import genai
        from google.genai import types

        self._types = types
        self.client = genai.Client(api_key=api_key)
        self.model = model

    def generate(self, messages, system, tools) -> LLMResponse:
        types = self._types
        cfg = {}
        if system:
            cfg["system_instruction"] = system
        if tools:
            decls = [
                types.FunctionDeclaration(
                    name=t["name"],
                    description=t.get("description", ""),
                    parameters_json_schema=t.get(
                        "parameters", {"type": "object", "properties": {}}),
                )
                for t in tools
            ]
            cfg["tools"] = [types.Tool(function_declarations=decls)]
            # We want the model to *propose* calls; we run them ourselves.
            cfg["automatic_function_calling"] = (
                types.AutomaticFunctionCallingConfig(disable=True))

        resp = self.client.models.generate_content(
            model=self.model,
            contents=self._to_contents(messages),
            config=types.GenerateContentConfig(**cfg),
        )
        return self._parse(resp)

    def _to_contents(self, messages):
        """Convert workshop message dicts into Gemini `Content` objects."""
        types = self._types
        contents = []
        for m in messages:
            role = m["role"]
            if role == "user":
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=m["content"])]))
            elif role == "assistant":
                parts = []
                if m.get("content"):
                    parts.append(types.Part.from_text(text=m["content"]))
                for tc in m.get("tool_calls", []):
                    parts.append(types.Part(function_call=types.FunctionCall(
                        name=tc.name, args=tc.args)))
                contents.append(types.Content(
                    role="model",
                    parts=parts or [types.Part.from_text(text="")]))
            elif role == "tool":
                contents.append(types.Content(
                    role="tool",
                    parts=[types.Part.from_function_response(
                        name=m["name"], response={"result": m["content"]})]))
        return contents

    def _parse(self, resp) -> LLMResponse:
        try:
            text = resp.text or ""
        except Exception:  # noqa: BLE001 — .text raises if there is no text part
            text = ""
        tool_calls = [
            ToolCall(name=fc.name, args=dict(fc.args or {}), id=f"call_{i}")
            for i, fc in enumerate(resp.function_calls or [])
        ]
        return LLMResponse(text=text, tool_calls=tool_calls)


class MockLLM:
    """A keyless stand-in for a real LLM.

    It is deliberately *not* intelligent: it uses a few keyword rules so the
    agent loop still runs end-to-end with no API key. With a real key you get
    real answers — the mock only keeps the mechanics observable.
    """

    def generate(self, messages, system=None, tools=None) -> LLMResponse:
        messages = as_messages(messages)
        last = messages[-1]
        user_text = self._last_user_text(messages)

        if not tools:
            return LLMResponse(text=(
                f"(MockLLM) '{user_text[:50]}...' — set GEMINI_API_KEY in .env "
                f"to see a real model's answer."))

        # If we already have a tool result, summarize and finish the loop.
        if last["role"] == "tool":
            return LLMResponse(text=(
                f"(MockLLM) 도구 '{last.get('name')}' 결과를 받았습니다 → "
                f"{str(last.get('content'))[:160]}"))

        # Otherwise, choose one tool to call.
        tool = self._pick_tool(user_text, tools)
        return LLMResponse(tool_calls=[
            ToolCall(name=tool["name"], args=self._guess_args(user_text, tool))])

    def generate_with_tools(self, messages, tools, system=None) -> LLMResponse:
        """Same public interface as LLMClient, so MockLLM is a drop-in stand-in."""
        return self.generate(messages, system, tools)

    @staticmethod
    def _last_user_text(messages) -> str:
        for m in reversed(messages):
            if m["role"] == "user":
                return m.get("content", "")
        return ""

    @staticmethod
    def _pick_tool(text, tools) -> dict:
        """Pick the tool whose name/description shares the most words."""
        words = set(re.findall(r"\w+", text.lower()))

        def score(tool):
            blob = (tool["name"] + " " + tool.get("description", "")).lower()
            return len(words & set(re.findall(r"\w+", blob)))

        return max(tools, key=score)

    @staticmethod
    def _guess_args(text, tool) -> dict:
        """Best-effort arguments — enough to make the tool run."""
        schema = tool.get("parameters", {})
        props = schema.get("properties", {})
        required = schema.get("required", [])
        numbers = re.findall(r"\d+", text)
        args = {}
        for name, spec in props.items():
            if spec.get("type") in ("integer", "number"):
                args[name] = int(numbers[0]) if numbers else 5
            elif name in required:
                args[name] = text[:20]  # crude placeholder for required strings
        return args


class ScriptedLLM:
    """Replays a fixed list of `LLMResponse` objects, one per call.

    This is how you test an agent *deterministically*, with no network and no
    cost — covered in Session 4. When the script is exhausted it returns a
    final text answer so the agent loop always terminates.
    """

    def __init__(self, responses):
        self._responses = list(responses)
        self._i = 0

    def generate(self, messages, system=None, tools=None) -> LLMResponse:
        if self._i < len(self._responses):
            response = self._responses[self._i]
            self._i += 1
            return response
        return LLMResponse(text="(ScriptedLLM) end of script.")

    def generate_with_tools(self, messages, tools, system=None) -> LLMResponse:
        """Same public interface as LLMClient, so ScriptedLLM is a drop-in stand-in."""
        return self.generate(messages, system, tools)
