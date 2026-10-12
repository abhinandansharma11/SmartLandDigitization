"""Optional handwriting recogniser (TrOCR / VisionEncoderDecoder).

Enabled only when HTR_MODEL is set, e.g. to a fine-tuned Devanagari TrOCR checkpoint directory.
Requires: pip install torch transformers
Confidence = exp(mean token log-prob) * 100.
"""
import functools

import numpy as np

from ..config import HTR_MODEL


@functools.lru_cache
def _load():
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    proc = TrOCRProcessor.from_pretrained(HTR_MODEL)
    model = VisionEncoderDecoderModel.from_pretrained(HTR_MODEL).eval()
    return proc, model


def recognise(crop: np.ndarray) -> tuple[str, float]:
    import math

    import torch
    from PIL import Image
    proc, model = _load()
    img = Image.fromarray(crop).convert("RGB")
    pixel_values = proc(images=img, return_tensors="pt").pixel_values
    with torch.no_grad():
        out = model.generate(pixel_values, output_scores=True, return_dict_in_generate=True, max_new_tokens=64)
    text = proc.batch_decode(out.sequences, skip_special_tokens=True)[0]
    scores = model.compute_transition_scores(out.sequences, out.scores, normalize_logits=True)
    conf = math.exp(float(scores.mean())) * 100 if scores.numel() else 0.0
    return text, round(conf, 1)
