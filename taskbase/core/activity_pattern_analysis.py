from typing import List, Tuple, Dict

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].

    Args:
        timestamps: list of epoch ms timestamps.
        counts: list of integer counts per timestamp.
        buckets: number of time buckets.
        normalize: whether to scale values into [0, 1].

    Returns:
        List of floats representing activity per bucket.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg

def summarize_heatmap(heatmap: List[float]) -> Dict[str, float]:
    """
    Provide quick summary statistics of a heatmap.
    """
    if not heatmap:
        return {"max": 0.0, "avg": 0.0, "active_buckets": 0}

    max_val = max(heatmap)
    avg_val = sum(heatmap) / len(heatmap)
    active_buckets = sum(1 for v in heatmap if v > 0)

    return {
        "max": round(max_val, 4),
        "avg": round(avg_val, 4),
        "active_buckets": active_buckets,
    }

def compare_heatmaps(h1: List[float], h2: List[float]) -> float:
    """
    Compute similarity between two heatmaps using cosine similarity.
    Returns value in [0, 1].
    """
    if not h1 or not h2 or len(h1) != len(h2):
        return 0.0

    dot = sum(a * b for a, b in zip(h1, h2))
    norm1 = sum(a * a for a in h1) ** 0.5
    norm2 = sum(b * b for b in h2) ** 0.5
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return round(dot / (norm1 * norm2), 4)
