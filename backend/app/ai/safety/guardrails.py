import re
from typing import Optional, Tuple

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|your\s+|any\s+)?(previous|prior)\s+instructions",
    r"you\s+are\s+now\s+in\s+(developer|debug)\s+mode",
    r"reveal\s+(all\s+)?(api\s+keys|passwords|secrets|database|system\s+prompt)",
    r"system\s+prompt\s+(override|leak|reveal)",
    r"bypass\s+(all\s+)?safety",
    r"(confidential|other\s+user['’]?s?)\s+transactions",
]

EXECUTION_INTENT_PATTERNS = [
    r"(buy|purchase|sell|trade|short)\s+\d+\s+(shares|stocks|crypto|coins)",
    r"(transfer|send|wire)\s+[₹$]?\d+",
    r"execute\s+(a\s+)?(trade|wire|transfer|transaction)",
    r"(pay|settle)\s+my\s+bill\s+now",
]

GUARANTEED_RETURN_PATTERNS = [
    r"guarantee\s+(me\s+)?a\s+return",
    r"guaranteed\s+(\d+%\s+)?(risk-free\s+)?returns?",
    r"which\s+stock\s+will\s+100%\s+make\s+me\s+rich",
    r"tell\s+me\s+a\s+guaranteed\s+investment",
]


class SafetyGuardrails:
    @staticmethod
    def inspect_query(query: str) -> Tuple[bool, Optional[str]]:
        """
        Inspects query for safety violations. Returns (is_safe, refusal_message).
        """
        clean = query.strip().lower()

        # 1. Check Execution Intents
        for pat in EXECUTION_INTENT_PATTERNS:
            if re.search(pat, clean):
                return (
                    False,
                    "FinPilot AI is a financial analysis and educational assistant. "
                    "I cannot execute trades, purchase securities, or initiate money transfers. "
                    "Please manage transactions directly through your authorized brokerage or banking institution."
                )

        # 2. Check Guaranteed Returns
        for pat in GUARANTEED_RETURN_PATTERNS:
            if re.search(pat, clean):
                return (
                    False,
                    "All investments carry risk of loss, and future market returns cannot be guaranteed. "
                    "FinPilot AI provides educational financial information and personal ledger analysis, "
                    "not regulated investment advisory services."
                )

        # 3. Check Prompt Injection
        for pat in PROMPT_INJECTION_PATTERNS:
            if re.search(pat, clean):
                return (
                    False,
                    "I detected an instruction override attempt. I operate strictly under FinPilot AI's financial analysis rules."
                )

        return (True, None)
