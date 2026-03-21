import base64
import io
from typing import Dict, List, Tuple

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy.stats import kurtosis

app = Flask(__name__)
CORS(app)

SEVERITY_RANK = {"CRITICAL": 4, "WARNING": 3, "NOTE": 2, "CLEAR": 1}


def signal(name: str, severity: str, technical_description: str) -> Dict:
    return {
        "name": name,
        "severity": severity,
        "technical_description": technical_description,
    }


def decode_image_from_base64(image_b64: str) -> Image.Image:
    raw = base64.b64decode(image_b64)
    pil_img = Image.open(io.BytesIO(raw)).convert("RGB")
    return pil_img


def pil_to_gray_np(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("L"), dtype=np.float32)


def detect_faces(gray_u8: np.ndarray):
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    return face_cascade.detectMultiScale(gray_u8, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))


def analyze_ela(img: Image.Image) -> Tuple[List[Dict], Dict]:
    signals = []
    metrics = {}

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=75)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")

    ela = ImageChops.difference(img, recompressed)
    extrema = ela.getextrema()
    max_diff = max(channel_max for _, channel_max in extrema)
    scale = 255.0 / max(1, max_diff)
    ela_img = ImageEnhance.Brightness(ela).enhance(scale)
    ela_np = np.array(ela_img, dtype=np.float32)

    luma = np.mean(ela_np, axis=2)
    mean_intensity = float(np.mean(luma))
    std_intensity = float(np.std(luma))
    region_std = std_intensity
    p95 = float(np.percentile(luma, 95))
    p99 = float(np.percentile(luma, 99))
    hotspot_ratio = float(np.mean(luma > (p95 + std_intensity)))

    metrics.update(
        {
            "mean_intensity": mean_intensity,
            "std_intensity": std_intensity,
            "p95": p95,
            "p99": p99,
            "hotspot_ratio": hotspot_ratio,
            "max_diff": float(max_diff),
            "region_std": region_std,
        }
    )

    if region_std > 20:
        signals.append(
            signal(
                "Error Level Compression Inconsistency",
                "CRITICAL",
                "ELA reveals strong localized high-error zones inconsistent with uniform JPEG history, suggesting potential compositing.",
            )
        )
    elif region_std > 12:
        signals.append(
            signal(
                "Error Level Compression Inconsistency",
                "WARNING",
                "ELA shows moderately uneven compression traces that can indicate edits or mixed-source regions.",
            )
        )
    else:
        signals.append(
            signal(
                "Error Level Compression Inconsistency",
                "CLEAR",
                "ELA pattern is broadly uniform with no prominent localized recompression anomalies.",
            )
        )

    return signals, metrics


def analyze_dct(img_cv: np.ndarray) -> Tuple[List[Dict], Dict]:
    gray_u8 = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    faces = detect_faces(gray_u8)
    metrics = {"face_count": int(len(faces))}
    signals = []

    if len(faces) == 0:
        signals.append(
            signal(
                "DCT Spectral Falloff Consistency",
                "NOTE",
                "No frontal face detected; DCT face-spectrum analysis skipped.",
            )
        )
        return signals, metrics

    x, y, w, h = faces[0]
    pad = int(0.12 * max(w, h))
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(img_cv.shape[1], x + w + pad)
    y2 = min(img_cv.shape[0], y + h + pad)
    roi = img_cv[y1:y2, x1:x2]

    resized = cv2.resize(roi, (512, 512), interpolation=cv2.INTER_AREA)
    ycrcb = cv2.cvtColor(resized, cv2.COLOR_BGR2YCrCb)
    y = ycrcb[:, :, 0].astype(np.float32) / 255.0

    low_energy = 0.0
    mid_energy = 0.0
    high_energy = 0.0
    block_features = []
    total_ac_energy = 0.0

    for i in range(0, 512, 8):
        for j in range(0, 512, 8):
            block = y[i : i + 8, j : j + 8]
            dct = cv2.dct(block)
            ac = np.abs(dct).copy()
            ac[0, 0] = 0.0
            energy = ac ** 2
            total_ac_energy += float(np.sum(energy))

            for u in range(8):
                for v in range(8):
                    if u == 0 and v == 0:
                        continue
                    band = u + v
                    e = float(energy[u, v])
                    if band <= 3:
                        low_energy += e
                    elif band <= 7:
                        mid_energy += e
                    else:
                        high_energy += e

            block_features.append(float(np.mean(energy[1:, 1:])))

    total = max(1e-9, low_energy + mid_energy + high_energy)
    low_ratio = low_energy / total
    mid_ratio = mid_energy / total
    high_ratio = high_energy / total
    high_to_low_ratio = high_energy / max(1e-9, low_energy)
    block_variance = float(np.var(block_features))

    metrics.update({
        "low_ratio": float(low_ratio),
        "mid_ratio": float(mid_ratio),
        "high_ratio": float(high_ratio),
        "high_to_low_ratio": float(high_to_low_ratio),
        "block_variance": block_variance,
        "total_ac_energy": float(total_ac_energy),
    })

    critical = high_to_low_ratio < 0.08 and block_variance < 0.00005
    warning = (
        high_to_low_ratio < 0.14 or
        block_variance < 0.00012 or
        (mid_ratio > 0.46 and high_ratio < 0.035)
    )

    if critical:
        signals.append(
            signal(
                "DCT Spectral Falloff Consistency",
                "CRITICAL",
                "DCT AC energy falloff and block-level variance are unusually uniform, consistent with GAN-like facial synthesis patterns.",
            )
        )
    elif warning:
        signals.append(
            signal(
                "DCT Spectral Falloff Consistency",
                "WARNING",
                "DCT band ratios show weaker natural 1/f decay or over-uniform block coefficients, which can indicate synthetic face generation.",
            )
        )
    else:
        signals.append(
            signal(
                "DCT Spectral Falloff Consistency",
                "CLEAR",
                "DCT coefficient decay and block variability are consistent with natural camera-image frequency behavior.",
            )
        )

    return signals, metrics


def analyze_fft_frequency(img: Image.Image) -> Tuple[List[Dict], Dict]:
    gray = pil_to_gray_np(img)
    gray = gray - np.mean(gray)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.log1p(np.abs(fshift))

    h, w = magnitude.shape
    cy, cx = h // 2, w // 2

    yy, xx = np.ogrid[:h, :w]
    rr = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)

    center_mask = rr <= max(6, min(h, w) * 0.03)
    ring_mask = (rr > max(12, min(h, w) * 0.08)) & (rr < min(h, w) * 0.45)

    ring_vals = magnitude[ring_mask]
    ring_mean = float(np.mean(ring_vals))
    ring_std = float(np.std(ring_vals) + 1e-6)

    peaks_mask = (magnitude > (ring_mean + 3.5 * ring_std)) & ring_mask
    peak_count = int(np.sum(peaks_mask))
    peak_density = float(peak_count / max(1, np.sum(ring_mask)))
    center_energy = float(np.mean(magnitude[center_mask]))
    ring_energy = float(np.mean(ring_vals))
    energy_ratio = float(ring_energy / max(1e-6, center_energy))

    metrics = {
        "peak_count": peak_count,
        "peak_density": peak_density,
        "center_energy": center_energy,
        "ring_energy": ring_energy,
        "ring_center_ratio": energy_ratio,
    }

    signals = []
    if peak_count > 120 and peak_density > 0.004:
        signals.append(
            signal(
                "FFT Checkerboard Periodicity",
                "CRITICAL",
                "Frequency spectrum shows dense periodic peaks compatible with checkerboard artifacts from generative upsampling.",
            )
        )
    elif peak_count > 70 or peak_density > 0.0025:
        signals.append(
            signal(
                "FFT Checkerboard Periodicity",
                "WARNING",
                "Frequency domain contains elevated periodic structure that may indicate synthetic generation artifacts.",
            )
        )
    else:
        signals.append(
            signal(
                "FFT Checkerboard Periodicity",
                "CLEAR",
                "No strong checkerboard-like periodic peaks were detected in the Fourier spectrum.",
            )
        )

    return signals, metrics


def analyze_color_distribution(img_cv: np.ndarray) -> Tuple[List[Dict], Dict]:
    hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    skin_low1 = cv2.inRange(hsv, (0, 20, 80), (30, 150, 255))
    skin_low2 = cv2.inRange(hsv, (150, 20, 80), (180, 150, 255))
    skin_mask = cv2.bitwise_or(skin_low1, skin_low2)

    skin_pixels = int(np.count_nonzero(skin_mask))
    total_pixels = int(skin_mask.size)
    skin_ratio = float(skin_pixels / max(1, total_pixels))

    metrics = {"skin_ratio": skin_ratio}
    signals = []

    if skin_ratio <= 0.05:
        signals.append(
            signal(
                "Skin Tone Distribution",
                "NOTE",
                "Insufficient skin-colored pixel coverage for reliable face color-distribution assessment.",
            )
        )
        return signals, metrics

    hue_vals = h[skin_mask > 0].astype(np.float32)
    sat_vals = s[skin_mask > 0].astype(np.float32)
    hue_std = float(np.std(hue_vals))
    sat_std = float(np.std(sat_vals))
    metrics.update({"hue_std": hue_std, "sat_std": sat_std})

    if hue_std < 5 and sat_std < 12:
        signals.append(
            signal(
                "Skin Tone Distribution",
                "WARNING",
                "Detected skin region has unusually narrow hue/saturation spread, which can indicate GAN-style color uniformity.",
            )
        )
    elif hue_std > 8 and sat_std > 20:
        signals.append(
            signal(
                "Skin Tone Distribution",
                "CLEAR",
                "Skin region shows natural hue and saturation variability expected in real facial photography.",
            )
        )
    else:
        signals.append(
            signal(
                "Skin Tone Distribution",
                "NOTE",
                "Skin color variability is borderline and does not provide strong standalone evidence.",
            )
        )

    return signals, metrics


def analyze_noise_pattern(img: Image.Image) -> Tuple[List[Dict], Dict]:
    gray = pil_to_gray_np(img)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    residual = gray - blurred

    residual_std = float(np.std(residual))
    residual_kurt = float(kurtosis(residual.flatten(), fisher=False, bias=False))

    gx = np.diff(residual, axis=1)
    gy = np.diff(residual, axis=0)
    anisotropy = float(abs(np.std(gx) - np.std(gy)) / max(1e-6, (np.std(gx) + np.std(gy)) / 2.0))

    metrics = {
        "residual_std": residual_std,
        "residual_kurtosis": residual_kurt,
        "anisotropy": anisotropy,
    }

    signals = []
    warning_flags = 0

    if residual_std < 3.5:
        warning_flags += 1
        signals.append(
            signal(
                "Noise Residual Strength",
                "WARNING",
                "Noise residual is unusually smooth, a pattern often associated with denoised diffusion outputs.",
            )
        )
    else:
        signals.append(
            signal(
                "Noise Residual Strength",
                "CLEAR",
                "Noise residual strength is within a plausible range for camera-captured imagery.",
            )
        )

    if anisotropy > 0.18:
        warning_flags += 1
        signals.append(
            signal(
                "Noise Directional Anisotropy",
                "WARNING",
                "Noise distribution differs by direction, which can reflect synthetic texture generation artifacts.",
            )
        )
    else:
        signals.append(
            signal(
                "Noise Directional Anisotropy",
                "CLEAR",
                "Noise structure is directionally balanced without strong anisotropic signatures.",
            )
        )

    if residual_kurt < 2.0 or residual_kurt > 5.5:
        warning_flags += 1
        signals.append(
            signal(
                "Noise Distribution Shape",
                "WARNING",
                "Noise kurtosis deviates from near-Gaussian camera noise behavior.",
            )
        )
    else:
        signals.append(
            signal(
                "Noise Distribution Shape",
                "CLEAR",
                "Noise kurtosis is consistent with a natural sensor-like distribution.",
            )
        )

    if warning_flags >= 3:
        signals.append(
            signal(
                "Aggregate Noise Forensics",
                "CRITICAL",
                "Multiple independent noise tests indicate non-natural residual behavior suggestive of synthetic generation.",
            )
        )

    return signals, metrics


def analyze_facial_symmetry(img_cv: np.ndarray) -> Tuple[List[Dict], Dict]:
    gray_u8 = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    faces = detect_faces(gray_u8)

    metrics = {"face_count": int(len(faces))}
    signals = []

    if len(faces) == 0:
        signals.append(
            signal(
                "Facial Bilateral Symmetry",
                "NOTE",
                "No frontal face detected; bilateral symmetry check skipped.",
            )
        )
        return signals, metrics

    x, y, w, h = faces[0]
    face = img_cv[y : y + h, x : x + w]
    face = cv2.resize(face, (256, 256), interpolation=cv2.INTER_AREA)

    left = face[:, :128, :].astype(np.float32)
    right = face[:, 128:, :].astype(np.float32)
    right_flipped = np.flip(right, axis=1)

    left_norm = left.reshape(-1)
    right_norm = right_flipped.reshape(-1)
    left_norm = (left_norm - np.mean(left_norm)) / (np.std(left_norm) + 1e-6)
    right_norm = (right_norm - np.mean(right_norm)) / (np.std(right_norm) + 1e-6)
    similarity = float(np.mean(left_norm * right_norm))

    metrics.update({"symmetry_similarity": similarity})

    if similarity > 0.92:
        signals.append(
            signal(
                "Facial Bilateral Symmetry",
                "CRITICAL",
                "Face halves are extremely similar, exceeding natural bilateral asymmetry expected in real human faces.",
            )
        )
    elif similarity > 0.87:
        signals.append(
            signal(
                "Facial Bilateral Symmetry",
                "WARNING",
                "Face exhibits unusually high left-right similarity, a common trait in GAN-generated portraits.",
            )
        )
    elif 0.65 <= similarity <= 0.87:
        signals.append(
            signal(
                "Facial Bilateral Symmetry",
                "CLEAR",
                "Facial symmetry falls within normal human asymmetry range.",
            )
        )
    else:
        signals.append(
            signal(
                "Facial Bilateral Symmetry",
                "NOTE",
                "Facial alignment/pose introduces low bilateral similarity; symmetry signal is inconclusive.",
            )
        )

    return signals, metrics


def analyze_face_background_consistency(img: Image.Image) -> Tuple[List[Dict], Dict]:
    rgb = np.array(img, dtype=np.uint8)
    gray_u8 = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    faces = detect_faces(gray_u8)

    metrics = {"face_count": int(len(faces))}
    signals = []

    if len(faces) == 0:
        signals.append(
            signal(
                "Face-Background Noise Consistency",
                "NOTE",
                "No frontal face detected; boundary consistency check not applicable to this image.",
            )
        )
        return signals, metrics

    residual = gray_u8.astype(np.float32) - cv2.GaussianBlur(gray_u8.astype(np.float32), (5, 5), 0)

    x, y, w, h = faces[0]
    face_region = residual[y : y + h, x : x + w]

    bg_mask = np.ones_like(residual, dtype=bool)
    bg_mask[y : y + h, x : x + w] = False
    bg_region = residual[bg_mask]

    face_std = float(np.std(face_region))
    bg_std = float(np.std(bg_region))
    diff_ratio = float(abs(face_std - bg_std) / max(1e-6, (face_std + bg_std) / 2.0))

    metrics.update({"face_noise_std": face_std, "bg_noise_std": bg_std, "noise_diff_ratio": diff_ratio})

    if diff_ratio > 0.45:
        signals.append(
            signal(
                "Face-Background Noise Consistency",
                "CRITICAL",
                "Face region noise differs strongly from background, which is consistent with potential face-swap compositing boundaries.",
            )
        )
    elif diff_ratio > 0.25:
        signals.append(
            signal(
                "Face-Background Noise Consistency",
                "WARNING",
                "Face/background noise mismatch is moderately elevated and may indicate source inconsistency.",
            )
        )
    else:
        signals.append(
            signal(
                "Face-Background Noise Consistency",
                "CLEAR",
                "Face and background noise levels are broadly consistent with a single-source capture pipeline.",
            )
        )

    return signals, metrics


def compute_verdict(all_signals: List[Dict]) -> Tuple[str, int]:
    critical = sum(1 for s in all_signals if s.get("severity") == "CRITICAL")
    warning = sum(1 for s in all_signals if s.get("severity") == "WARNING")
    clear = sum(1 for s in all_signals if s.get("severity") == "CLEAR")

    if critical >= 2:
        return "LIKELY_AI", 90
    if critical == 1 or warning >= 3:
        return "LIKELY_AI", 76
    if clear >= 3 and critical == 0:
        return "LIKELY_AUTHENTIC", 78
    return "INCONCLUSIVE", 58


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "VeritasAI Forensics"})


@app.post("/analyze")
def analyze():
    body = request.get_json(silent=True) or {}
    image_b64 = body.get("image")
    media_type = body.get("mediaType", "image/jpeg")

    if not image_b64:
        return jsonify({"error": "Missing image"}), 400
    if not str(media_type).startswith("image/"):
        return jsonify({"error": "Only image mediaType is supported"}), 400

    try:
        img = decode_image_from_base64(image_b64)
    except Exception as exc:
        return jsonify({"error": f"Failed to decode image: {exc}"}), 400

    img_cv = cv2.cvtColor(np.array(img, dtype=np.uint8), cv2.COLOR_RGB2BGR)
    analyses = {}
    all_signals: List[Dict] = []

    ela_signals, ela_metrics = analyze_ela(img)
    analyses["ela"] = {"signals": ela_signals, "metrics": ela_metrics}
    all_signals.extend(ela_signals)

    fft_signals, fft_metrics = analyze_fft_frequency(img)
    analyses["fft"] = {"signals": fft_signals, "metrics": fft_metrics}
    all_signals.extend(fft_signals)

    noise_signals, noise_metrics = analyze_noise_pattern(img)
    analyses["noise"] = {"signals": noise_signals, "metrics": noise_metrics}
    all_signals.extend(noise_signals)

    dct_signals, dct_metrics = analyze_dct(img_cv)
    analyses["dct"] = {"signals": dct_signals, "metrics": dct_metrics}
    all_signals.extend(dct_signals)

    color_signals, color_metrics = analyze_color_distribution(img_cv)
    analyses["color_distribution"] = {"signals": color_signals, "metrics": color_metrics}
    all_signals.extend(color_signals)

    sym_signals, sym_metrics = analyze_facial_symmetry(img_cv)
    analyses["facial_symmetry"] = {"signals": sym_signals, "metrics": sym_metrics}
    all_signals.extend(sym_signals)

    fb_signals, fb_metrics = analyze_face_background_consistency(img)
    analyses["face_background"] = {"signals": fb_signals, "metrics": fb_metrics}
    all_signals.extend(fb_signals)

    # Keep strongest signals first, cap to same size expectation as Node pipeline.
    all_signals = sorted(
        all_signals, key=lambda s: SEVERITY_RANK.get(s.get("severity", "NOTE"), 0), reverse=True
    )[:8]

    verdict, confidence = compute_verdict(all_signals)

    return jsonify(
        {
            "verdict": verdict,
            "confidence": confidence,
            "signals": all_signals,
            "details": analyses,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
