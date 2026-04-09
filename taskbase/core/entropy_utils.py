import math
from typing import List, Dict, Any

def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    """
    if not addresses:
        return 0.0
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def entropy_breakdown(addresses: List[str]) -> Dict[str, Any]:
    """
    Return entropy along with frequency distribution and normalized probabilities.
    """
    if not addresses:
        return {"entropy": 0.0, "distribution": {}}

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)

    probs = {addr: count / total for addr, count in freq.items()}
    entropy = -sum(p * math.log2(p) for p in probs.values())
    return {
        "entropy": round(entropy, 4),
        "distribution": probs,
        "unique_count": len(freq),
        "total_count": total,
    }

def classify_entropy(entropy: float, max_entropy: float) -> str:
    """
    Classify entropy relative to maximum possible value.
    """
    if max_entropy <= 0:
        return "undefined"
    ratio = entropy / max_entropy
    if ratio < 0.3:
        return "low"
    elif ratio < 0.7:
        return "medium"
    return "high"

def assess_address_diversity(addresses: List[str]) -> Dict[str, Any]:
    """
    Run full diversity assessment: entropy, distribution, and classification.
    """
    breakdown = entropy_breakdown(addresses)
    max_entropy = math.log2(breakdown["unique_count"]) if breakdown["unique_count"] > 0 else 0
    classification = classify_entropy(breakdown["entropy"], max_entropy)
    breakdown["classification"] = classification
    breakdown["max_entropy"] = round(max_entropy, 4)
    return breakdown
