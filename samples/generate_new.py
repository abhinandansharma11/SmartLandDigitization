"""Extra fresh samples (fictional) that don't clash with 01-15, for a clean live demo.
    python samples/generate_new.py"""
from generate import VILLAGES, khatauni, degrade, save

rampur = VILLAGES[0]
# 16 · clean record, two brothers, plots 116 + 117 → should publish automatically
k51 = khatauni(rampur, "51", "1-क भूमिधर जिनके अधिकार संक्रमणीय हैं",
               [("सुरेश कुमार", "पुत्र", "महेश कुमार", "रामपुर कलां", "1/2"),
                ("दिनेश कुमार", "पुत्र", "महेश कुमार", "रामपुर कलां", "1/2")],
               [("116", "0.295"), ("117", "0.450")],
               mutation="वाद संख्या 118/2021 आदेश दिनांक 22-08-2021 उत्तराधिकार",
               registration="विलेख संख्या 2231/2020 उप निबंधक मलिहाबाद दिनांक 14-11-2020")
save(degrade(k51, angle=0.6, noise=3), "16_khatauni_rampur_khata51_new.png")
# 17 · single owner, plot 118, phone-photo style (skew + noise) → read, likely a quick review
k52 = khatauni(rampur, "52", "1-क", [("सरिता देवी", "पत्नी", "अशोक कुमार", "रामपुर कलां", "1/1")],
               [("118", "0.330")])
save(degrade(k52, angle=-1.8, noise=8, blur=0.6), "17_khatauni_rampur_khata52_photo.jpg", jpeg=82)
