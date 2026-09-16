"""
ml/vision/quality.py
--------------------
Stage A: Image Quality Gate for Citizen Submissions.

Evaluates image validity, resolution, blur (Laplacian variance), brightness,
and contrast to assign an image_quality_score (0-100) and status:
ACCEPT, LOW_QUALITY, or REJECT.
"""

from dataclasses import dataclass, field
import io
import math
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from PIL import Image, ImageStat, ImageOps


@dataclass
class ImageQualityResult:
    is_valid: bool
    status: str  # "ACCEPT", "LOW_QUALITY", "REJECT"
    image_quality_score: float  # 0.0 - 100.0
    width: int
    height: int
    aspect_ratio: float
    mime_type: Optional[str]
    file_size_bytes: int
    blur_score: float
    brightness_score: float
    contrast_score: float
    issues: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


def compute_laplacian_variance(gray_array: np.ndarray) -> float:
    """
    Computes variance of the Laplacian filter as a measure of sharpness/blur.
    Uses pure NumPy with standard 3x3 Laplacian kernel to ensure zero-dependency portability.
    """
    try:
        # If cv2 is available, we can optionally use cv2.Laplacian
        import cv2  # type: ignore
        return float(cv2.Laplacian(gray_array, cv2.CV_64F).var())
    except ImportError:
        pass

    # NumPy 3x3 discrete Laplacian approximation
    # Kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
    h, w = gray_array.shape
    if h < 3 or w < 3:
        return 0.0
    
    padded = np.pad(gray_array.astype(np.float64), 1, mode='edge')
    laplacian = (
        padded[:-2, 1:-1] +
        padded[2:, 1:-1] +
        padded[1:-1, :-2] +
        padded[1:-1, 2:] -
        4.0 * padded[1:-1, 1:-1]
    )
    return float(np.var(laplacian))


def evaluate_image_quality(
    image_input: Any,
    min_width: int = 224,
    min_height: int = 224,
    max_file_size_bytes: int = 10 * 1024 * 1024,  # 10MB contract limit
) -> ImageQualityResult:
    """
    Evaluates raw image bytes or PIL Image against the quality gate.
    """
    issues: List[str] = []
    file_size_bytes = 0
    mime_type = None

    pil_img: Optional[Image.Image] = None

    if isinstance(image_input, bytes):
        file_size_bytes = len(image_input)
        if file_size_bytes == 0:
            return ImageQualityResult(
                is_valid=False,
                status="REJECT",
                image_quality_score=0.0,
                width=0,
                height=0,
                aspect_ratio=0.0,
                mime_type=None,
                file_size_bytes=0,
                blur_score=0.0,
                brightness_score=0.0,
                contrast_score=0.0,
                issues=["Empty image payload received."],
                metrics={},
            )
        if file_size_bytes > max_file_size_bytes:
            issues.append(f"File size exceeds 10MB limit ({file_size_bytes / (1024*1024):.2f}MB).")

        try:
            pil_img = Image.open(io.BytesIO(image_input))
            pil_img.load()
            mime_type = Image.MIME.get(pil_img.format) if pil_img.format else "image/unknown"
        except Exception as e:
            return ImageQualityResult(
                is_valid=False,
                status="REJECT",
                image_quality_score=0.0,
                width=0,
                height=0,
                aspect_ratio=0.0,
                mime_type=None,
                file_size_bytes=file_size_bytes,
                blur_score=0.0,
                brightness_score=0.0,
                contrast_score=0.0,
                issues=[f"Corrupted or unsupported image file: {str(e)}"],
                metrics={},
            )
    elif isinstance(image_input, Image.Image):
        pil_img = image_input
        file_size_bytes = getattr(pil_img, "size_bytes", 0)
        mime_type = "image/jpeg"
    else:
        return ImageQualityResult(
            is_valid=False,
            status="REJECT",
            image_quality_score=0.0,
            width=0,
            height=0,
            aspect_ratio=0.0,
            mime_type=None,
            file_size_bytes=0,
            blur_score=0.0,
            brightness_score=0.0,
            contrast_score=0.0,
            issues=["Invalid image input format."],
            metrics={},
        )

    # Convert to RGB if palette/RGBA
    if pil_img.mode not in ("RGB", "L"):
        try:
            pil_img = pil_img.convert("RGB")
        except Exception:
            pass

    width, height = pil_img.size
    aspect_ratio = width / max(height, 1)

    # Check minimum dimensions
    if width < min_width or height < min_height:
        issues.append(f"Extremely low resolution: {width}x{height} (min required {min_width}x{min_height}).")

    # Grayscale conversion for metrics
    gray_img = pil_img.convert("L")
    gray_np = np.array(gray_img, dtype=np.uint8)

    # Blur detection
    lap_var = compute_laplacian_variance(gray_np)
    # Brightness & contrast
    stat = ImageStat.Stat(gray_img)
    mean_brightness = stat.mean[0]  # 0 to 255
    std_contrast = stat.stddev[0]   # 0 to 128

    if mean_brightness < 20.0:
        issues.append(f"Image is excessively dark (mean luminance {mean_brightness:.1f}/255).")
    elif mean_brightness > 238.0:
        issues.append(f"Image is overexposed/washed out (mean luminance {mean_brightness:.1f}/255).")

    if std_contrast < 8.0:
        issues.append(f"Extremely low contrast/blank image (std dev {std_contrast:.1f}).")

    if lap_var < 15.0:
        issues.append(f"Image appears excessively blurry (Laplacian variance {lap_var:.1f}).")

    # Score synthesis (0-100)
    # Resolution factor: 0 at <100px, 1.0 at >=640px
    res_factor = min(1.0, math.sqrt(width * height) / 480.0)
    # Sharpness factor: 0 at <10, 1.0 at >=100
    sharp_factor = min(1.0, max(0.0, (lap_var - 10.0) / 90.0))
    # Lighting factor: optimal around 60-180
    if 50.0 <= mean_brightness <= 200.0:
        light_factor = 1.0
    else:
        light_factor = max(0.0, 1.0 - abs(mean_brightness - 128.0) / 128.0)
    # Contrast factor
    contrast_factor = min(1.0, max(0.0, std_contrast / 40.0))

    base_score = (
        (res_factor * 0.25) +
        (sharp_factor * 0.35) +
        (light_factor * 0.20) +
        (contrast_factor * 0.20)
    ) * 100.0

    final_score = round(max(0.0, min(100.0, base_score)), 1)

    # Status determination
    if width < min_width or height < min_height or std_contrast < 5.0:
        status = "REJECT"
        is_valid = False
    elif final_score < 45.0 or len(issues) >= 2:
        status = "LOW_QUALITY"
        is_valid = True
    else:
        status = "ACCEPT"
        is_valid = True

    metrics = {
        "width": width,
        "height": height,
        "aspect_ratio": round(aspect_ratio, 2),
        "laplacian_variance": round(lap_var, 2),
        "mean_brightness": round(mean_brightness, 2),
        "std_contrast": round(std_contrast, 2),
        "res_factor": round(res_factor, 2),
        "sharp_factor": round(sharp_factor, 2),
        "light_factor": round(light_factor, 2),
        "contrast_factor": round(contrast_factor, 2),
    }

    return ImageQualityResult(
        is_valid=is_valid,
        status=status,
        image_quality_score=final_score,
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
        mime_type=mime_type,
        file_size_bytes=file_size_bytes,
        blur_score=round(lap_var, 2),
        brightness_score=round(mean_brightness, 2),
        contrast_score=round(std_contrast, 2),
        issues=issues,
        metrics=metrics,
    )
