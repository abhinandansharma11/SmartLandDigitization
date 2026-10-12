"""Stand-in for the IndicOCR GPU server and the Bodhan hosted API, returning a perfect transcription
of sample 01. Used only to test the integration (merge, confidence, fallback) without a GPU."""
from fastapi import FastAPI, File, UploadFile

app = FastAPI()
PAGE = """# उत्तर प्रदेश शासन - राजस्व विभाग
## खतौनी (अधिकार अभिलेख)
ग्राम: रामपुर कलां परगना: मलिहाबाद
तहसील: मलिहाबाद जनपद: लखनऊ
फसली वर्ष: १४२८ से १४३३
**खाता संख्या: ४५**
श्रेणी: १-क भूमिधर जिनके अधिकार संक्रमणीय हैं

| क्रम | खातेदार का नाम, पिता/पति का नाम व निवास | हिस्सा |
|---|---|---|
| १ | राम प्रसाद पुत्र शिव प्रसाद निवासी रामपुर कलां | १/२ |
| २ | श्याम लाल पुत्र शिव प्रसाद निवासी रामपुर कलां | १/२ |

<table><tr><th>गाटा संख्या</th><th>क्षेत्रफल (हेक्टेयर)</th></tr><tr><td>११२</td><td>०.४०५</td></tr><tr><td>११३क</td><td>०.२५०</td></tr></table>

**योग: २ गाटा ०.६५५ हेक्टेयर**
नामांतरण: वाद संख्या २३४/२०१९ आदेश दिनांक १२-०३-२०१९ उत्तराधिकार
पंजीकरण: विलेख संख्या १४५६/२०१८ उप निबंधक मलिहाबाद दिनांक ०५-०७-२०१८"""


@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    await file.read()
    return {"width": 1654, "height": 2339, "blocks": [{"order": 0, "label": "Text", "type": "Text",
            "bbox_xyxy": [100, 80, 1550, 1700], "conf": 0.9, "text": PAGE}]}


@app.post("/v1/chat/completions")
async def chat(body: dict):
    assert body["messages"][0]["content"][0]["image_url"]["url"].startswith("data:image/png;base64,")
    return {"choices": [{"message": {"role": "assistant", "content": PAGE}}]}
