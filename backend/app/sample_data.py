"""Demo reference data (clearly fictional). Shared by seed.py and samples/generate.py.

LGD codes in the 9000xx range are *not* real LGD codes — replace with the state's master data."""

VILLAGES = [
    # lgd, hindi, english, tehsil, district, state, bbox [minlon, minlat, maxlon, maxlat]
    ("900001", "रामपुर कलां", "Rampur Kalan", "Malihabad", "Lucknow", "Uttar Pradesh", [80.7000, 26.9200, 80.7080, 26.9260]),
    ("900002", "बहादुरपुर", "Bahadurpur", "Malihabad", "Lucknow", "Uttar Pradesh", [80.7200, 26.9300, 80.7260, 26.9345]),
    ("900003", "सराय खेड़ा", "Sarai Kheda", "Sidhauli", "Sitapur", "Uttar Pradesh", [80.8300, 27.2800, 80.8370, 27.2850]),
    ("900011", "शिरगाव", "Shirgaon", "Haveli", "Pune", "Maharashtra", [73.9500, 18.4500, 73.9570, 18.4550]),
    ("900021", "রামনগর", "Ramnagar", "Singur", "Hooghly", "West Bengal", [88.2200, 22.8100, 88.2270, 22.8150]),
    ("900031", "வடக்குப்பட்டி", "Vadakkupatti", "Melur", "Madurai", "Tamil Nadu", [78.3300, 10.0300, 78.3370, 10.0350]),
    ("900041", "ਰਾਮਪੁਰਾ", "Rampura", "Kharar", "Mohali", "Punjab", [76.6400, 30.7400, 76.6470, 30.7450]),
]

# English name → name as printed on the record (per state's language)
NATIVE = {"Malihabad": "मलिहाबाद", "Sidhauli": "सिधौली", "Lucknow": "लखनऊ", "Sitapur": "सीतापुर",
          "Haveli": "हवेली", "Pune": "पुणे", "Singur": "সিঙ্গুর", "Hooghly": "হুগলি",
          "Melur": "மேலூர்", "Madurai": "மதுரை", "Kharar": "ਖਰੜ", "Mohali": "ਮੋਹਾਲੀ"}
TEHSIL_HI = DISTRICT_HI = NATIVE          # backwards-compatible aliases

# Parcels pre-loaded for Rampur Kalan (khasra -> area in hectare). Bahadurpur parcels come from
# digitizing the sample map sheet; Sarai Kheda has none (shows the "no parcel" validation).
RAMPUR_PARCELS = {"110": 0.310, "111": 0.520, "112": 0.405, "113क": 0.250, "113ख": 0.240,
                  "114": 0.610, "115": 0.380, "116": 0.295, "117": 0.450, "118": 0.330}

# Parcels pre-loaded for the other states' sample villages (khasra/survey/dag -> hectare)
STATE_PARCELS = {
    "900011": {"45/1": 1.205, "45/2": 0.6, "46": 0.81, "47": 0.4},        # Shirgaon (gat no.)
    "900021": {"112": 0.1335, "113": 0.2023, "114/1": 0.0809},            # Ramnagar (dag no.)
    "900031": {"112/3A": 0.455, "112/3B": 0.3, "113": 0.62},               # Vadakkupatti (survey no.)
    "900041": {"45//12": 0.4047, "45//13": 0.2023, "46//1": 0.4047},       # Rampura (murabba//killa)
}

# Area units (UP). Bigha size varies by district — this is configuration, not a constant.
AREA_UNITS = {
    "default": {"bigha_ha": 0.2529, "biswa_per_bigha": 20, "biswansi_per_biswa": 20},
    "Lucknow": {"bigha_ha": 0.2529, "biswa_per_bigha": 20, "biswansi_per_biswa": 20},
    "Sitapur": {"bigha_ha": 0.2529, "biswa_per_bigha": 20, "biswansi_per_biswa": 20},
}

# Mock state LRMS (Bhulekh) holdings used for cross-database verification.
MOCK_LRMS = {
    ("900001", "45"): {"owners": ["राम प्रसाद", "श्याम लाल"], "khasras": ["112", "113क"], "total_area_ha": 0.655},
    ("900001", "47"): {"owners": ["मोहन लाल"], "khasras": ["115"], "total_area_ha": 0.380},
    ("900001", "46"): {"owners": ["गीता देवी"], "khasras": ["114"], "total_area_ha": 0.607},
    ("900011", "312"): {"owners": ["रमेश गणपत पाटील", "सुनिता रमेश पाटील"], "khasras": ["45/1"], "total_area_ha": 1.205},
    ("900021", "56"): {"owners": ["রহিম শেখ", "সালমা বিবি"], "khasras": ["112", "113"], "total_area_ha": 0.3358},
    ("900031", "1024"): {"owners": ["முருகன்"], "khasras": ["112/3A"], "total_area_ha": 0.455},
    ("900041", "88"): {"owners": ["ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ", "ਹਰਪ੍ਰੀਤ ਸਿੰਘ"], "khasras": ["45//12", "45//13"], "total_area_ha": 0.607},
}

UP_CATEGORIES = ["1-क", "1-ख", "2", "3", "4", "5", "6"]

DEMO_USERS = [
    # username, full name, role, state, district, tehsil
    ("operator", "Anil Verma (Data-entry, Malihabad)", "operator", "Uttar Pradesh", "Lucknow", "Malihabad"),
    ("reviewer", "Priya Singh (Reviewer, Lucknow)", "reviewer", "Uttar Pradesh", "Lucknow", None),
    ("supervisor", "R. K. Mishra (Tehsildar, Lucknow)", "supervisor", "Uttar Pradesh", "Lucknow", None),
    ("gis", "Neha Gupta (GIS reviewer, Lucknow)", "gis_reviewer", "Uttar Pradesh", "Lucknow", None),
    ("sitapur", "Vikas Yadav (Reviewer, Sitapur)", "reviewer", "Uttar Pradesh", "Sitapur", None),
    ("dadmin", "District Admin Lucknow", "district_admin", "Uttar Pradesh", "Lucknow", None),
    ("stateadmin", "State Admin UP", "state_admin", "Uttar Pradesh", None, None),
    ("admin", "Super Admin (DoLR)", "super_admin", None, None, None),
    ("auditor", "Auditor (read-only)", "auditor", None, None, None),
    ("vendor", "Scanning vendor (integration)", "integration", "Uttar Pradesh", None, None),
    ("pune", "Maharashtra reviewer (Pune)", "reviewer", "Maharashtra", "Pune", None),
    ("hooghly", "West Bengal reviewer (Hooghly)", "reviewer", "West Bengal", "Hooghly", None),
    ("madurai", "Tamil Nadu reviewer (Madurai)", "reviewer", "Tamil Nadu", "Madurai", None),
    ("mohali", "Punjab reviewer (Mohali)", "reviewer", "Punjab", "Mohali", None),
    ("multi_op", "Multi-state data-entry operator", "operator", None, None, None),
]
DEMO_PASSWORD = "demo123"

DEFAULT_THRESHOLDS = {
    "khata_no": 85, "village": 80, "category": 70, "fasli_year": 70,
    "owner.name": 85, "owner.relative_name": 80, "owner.share": 85,
    "plot.khasra_no": 88, "plot.area_ha": 88, "total_area_ha": 85,
    "mutation": 60, "registration": 60, "map.khasra_no": 80,
}
