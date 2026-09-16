"""
tests/ml/test_vision_authenticity.py
------------------------------------
Unit tests for Stage B Perceptual Hashing & Duplicate Detection.
"""

import io
import numpy as np
from PIL import Image
import pytest

from ml.vision.authenticity import (
    compute_phash,
    compute_dhash,
    compute_sha256,
    hamming_distance,
    check_image_reuse,
)


def make_pil_image(color=(100, 150, 200), size=(256, 256)):
    arr = np.full((size[1], size[0], 3), color, dtype=np.int32)
    # Add gradient
    for y in range(size[1]):
        arr[y, :, 0] = (arr[y, :, 0] + y // 2) % 256
    return Image.fromarray(arr.astype(np.uint8))


def test_phash_and_dhash_generation():
    img = make_pil_image()
    phash = compute_phash(img)
    dhash = compute_dhash(img)

    assert isinstance(phash, str)
    assert len(phash) == 16  # 64 bits = 16 hex chars
    assert isinstance(dhash, str)
    assert len(dhash) == 16


def test_hamming_distance_exact_and_different():
    h1 = "0000000000000000"
    h2 = "0000000000000000"
    assert hamming_distance(h1, h2) == 0

    h3 = "0000000000000001"  # 1 bit difference
    assert hamming_distance(h1, h3) == 1

    h4 = "ffffffffffffffff"  # 64 bits difference
    assert hamming_distance(h1, h4) == 64


def test_sha256():
    data = b"landslide_test_image_bytes"
    h = compute_sha256(data)
    assert len(h) == 64
    assert h == compute_sha256(data)


def test_exact_duplicate_detection():
    img = make_pil_image()
    phash = compute_phash(img)

    # Check against database containing identical hash
    res = check_image_reuse(phash, [phash, "1234567890abcdef"])
    assert res.is_duplicate is True
    assert res.verdict == "EXACT_DUPLICATE"
    assert res.min_hamming_distance == 0
    assert res.image_reuse_score <= 20.0


def test_near_duplicate_detection():
    h_base = "1111222233334444"
    # Flip 4 bits: '1' -> '0' or similar
    h_near = "1111222233334440"  # Small distance <= 4
    res = check_image_reuse(h_base, [h_near])
    assert res.is_duplicate is True
    assert res.verdict in ("EXACT_DUPLICATE", "NEAR_DUPLICATE")
    assert res.min_hamming_distance <= 10


def test_unique_novel_image():
    h1 = "0000000000000000"
    h2 = "ffffffffffffffff"
    res = check_image_reuse(h1, [h2])
    assert res.is_duplicate is False
    assert res.verdict == "UNIQUE"
    assert res.min_hamming_distance == 64
    assert res.image_reuse_score >= 80.0
