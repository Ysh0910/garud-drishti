"""
ml/vision/authenticity.py
-------------------------
Stage B: Image Authenticity, Perceptual Hashing (pHash, dHash), SHA-256,
and Duplicate/Reused Evidence Detection.
"""

from dataclasses import dataclass, field
import hashlib
from typing import List, Optional, Tuple
import numpy as np
from PIL import Image


@dataclass
class ImageReuseResult:
    is_duplicate: bool
    min_hamming_distance: int
    matched_hash: Optional[str]
    image_reuse_score: float  # 0-100: 100.0 is completely novel/unique, lower is suspicious reuse
    verdict: str  # "UNIQUE", "NEAR_DUPLICATE", "EXACT_DUPLICATE"
    explanation: str


def compute_sha256(image_bytes: bytes) -> str:
    """Computes standard SHA-256 hex digest of image bytes."""
    return hashlib.sha256(image_bytes).hexdigest()


def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """
    Computes difference hash (dHash) based on horizontal luminance gradients.
    Output is hex string representing 64-bit binary hash.
    """
    # Resize to (hash_size + 1, hash_size)
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(resized, dtype=np.float32)
    # Compare adjacent pixels in each row
    difference = pixels[:, 1:] > pixels[:, :-1]
    # Pack boolean array into hex string
    bit_string = "".join(["1" if val else "0" for val in difference.flatten()])
    return f"{int(bit_string, 2):0{hash_size * hash_size // 4}x}"


def compute_phash(image: Image.Image, hash_size: int = 8, highfreq_factor: int = 4) -> str:
    """
    Computes perceptual hash (pHash) using discrete cosine transform (DCT) low frequencies.
    Pure NumPy implementation for DCT-II.
    """
    img_size = hash_size * highfreq_factor
    resized = image.convert("L").resize((img_size, img_size), Image.Resampling.LANCZOS)
    pixels = np.array(resized, dtype=np.float32)

    # 2D DCT-II implementation using NumPy
    def dct_1d(matrix: np.ndarray) -> np.ndarray:
        N = matrix.shape[1]
        k = np.arange(N).reshape((1, N, 1))
        n = np.arange(N).reshape((1, 1, N))
        weights = np.cos(np.pi * (2 * n + 1) * k / (2.0 * N))
        res = np.sum(matrix[:, None, :] * weights, axis=2)
        res[:, 0] *= 1.0 / np.sqrt(2.0)
        res *= np.sqrt(2.0 / N)
        return res

    dct_rows = dct_1d(pixels)
    dct_2d = dct_1d(dct_rows.T).T

    # Extract top-left low-frequency submatrix (excluding DC term at [0,0])
    dct_low = dct_2d[:hash_size, :hash_size]
    med = np.median(dct_low)
    diff = dct_low > med
    bit_string = "".join(["1" if b else "0" for b in diff.flatten()])
    return f"{int(bit_string, 2):0{hash_size * hash_size // 4}x}"


def hamming_distance(hash1: str, hash2: str) -> int:
    """
    Computes bitwise Hamming distance between two hex hash strings.
    """
    try:
        val1 = int(hash1, 16)
        val2 = int(hash2, 16)
        xor_val = val1 ^ val2
        return bin(xor_val).count("1")
    except ValueError:
        # Fallback character mismatch count
        return sum(c1 != c2 for c1, c2 in zip(hash1, hash2))


def check_image_reuse(
    new_hash: str,
    existing_hashes: List[str],
    exact_threshold: int = 3,
    near_threshold: int = 10,
) -> ImageReuseResult:
    """
    Compares a candidate pHash against existing database hashes.
    Thresholds:
      <= exact_threshold (3 bits): Exact duplicate / identical image
      <= near_threshold (10 bits): Near-duplicate / cropped / color-filtered version
      > near_threshold: Distinct evidence
    """
    if not existing_hashes:
        return ImageReuseResult(
            is_duplicate=False,
            min_hamming_distance=64,
            matched_hash=None,
            image_reuse_score=100.0,
            verdict="UNIQUE",
            explanation="No existing report images in database to compare against.",
        )

    min_dist = 64
    closest_hash: Optional[str] = None

    for prev_h in existing_hashes:
        dist = hamming_distance(new_hash, prev_h)
        if dist < min_dist:
            min_dist = dist
            closest_hash = prev_h
            if min_dist == 0:
                break

    if min_dist <= exact_threshold:
        is_dup = True
        verdict = "EXACT_DUPLICATE"
        # Severe penalty: reuse score 10
        reuse_score = max(5.0, min_dist * 3.0)
        explanation = f"Exact duplicate detected (Hamming distance {min_dist} <= {exact_threshold})."
    elif min_dist <= near_threshold:
        is_dup = True
        verdict = "NEAR_DUPLICATE"
        # Moderate penalty: reuse score 20-50
        reuse_score = 15.0 + (min_dist - exact_threshold) * 5.0
        explanation = f"Near-duplicate/modified image detected (Hamming distance {min_dist} <= {near_threshold})."
    else:
        is_dup = False
        verdict = "UNIQUE"
        # Clean score 80-100
        reuse_score = min(100.0, 75.0 + (min_dist - near_threshold) * 2.0)
        explanation = f"Unique visual evidence confirmed (Hamming distance {min_dist} > {near_threshold})."

    return ImageReuseResult(
        is_duplicate=is_dup,
        min_hamming_distance=min_dist,
        matched_hash=closest_hash,
        image_reuse_score=round(reuse_score, 1),
        verdict=verdict,
        explanation=explanation,
    )
