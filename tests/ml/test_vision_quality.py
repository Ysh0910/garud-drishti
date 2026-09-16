"""
tests/ml/test_vision_quality.py
-------------------------------
Unit tests for Stage A Image Quality Gate.
"""

import io
import numpy as np
from PIL import Image
import pytest

from ml.vision.quality import evaluate_image_quality, compute_laplacian_variance


def create_test_image(
    width: int = 300,
    height: int = 300,
    color: tuple = (120, 100, 80),
    add_noise: bool = True,
) -> bytes:
    """Creates synthetic JPEG bytes for testing."""
    img_arr = np.full((height, width, 3), color, dtype=np.uint8)
    if add_noise:
        noise = np.random.randint(-30, 30, (height, width, 3), dtype=np.int16)
        img_arr = np.clip(img_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_valid_image_quality_accept():
    img_bytes = create_test_image(400, 400, color=(140, 110, 90), add_noise=True)
    res = evaluate_image_quality(img_bytes)
    assert res.is_valid is True
    assert res.status in ("ACCEPT", "LOW_QUALITY")
    assert res.image_quality_score > 40.0
    assert res.width == 400
    assert res.height == 400


def test_corrupted_image_bytes():
    corrupted = b"NOT_AN_IMAGE_DATA_12345"
    res = evaluate_image_quality(corrupted)
    assert res.is_valid is False
    assert res.status == "REJECT"
    assert res.image_quality_score == 0.0
    assert len(res.issues) > 0


def test_empty_image_bytes():
    res = evaluate_image_quality(b"")
    assert res.is_valid is False
    assert res.status == "REJECT"
    assert "Empty image" in res.issues[0]


def test_low_resolution_rejection():
    small_bytes = create_test_image(100, 100)
    res = evaluate_image_quality(small_bytes, min_width=224, min_height=224)
    assert res.is_valid is False
    assert res.status == "REJECT"
    assert any("low resolution" in issue.lower() for issue in res.issues)


def test_extremely_dark_image():
    dark_bytes = create_test_image(300, 300, color=(5, 5, 5), add_noise=False)
    res = evaluate_image_quality(dark_bytes)
    assert any("dark" in issue.lower() for issue in res.issues)


def test_blank_zero_contrast_image():
    blank_bytes = create_test_image(300, 300, color=(128, 128, 128), add_noise=False)
    res = evaluate_image_quality(blank_bytes)
    assert res.is_valid is False or res.status in ("REJECT", "LOW_QUALITY")
    assert res.contrast_score < 5.0
