
import pandas as pd
from pathlib import Path

# Project ke datasets folder ka path
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_FILE = BASE_DIR / "datasets" / "property_prices.csv"

EXPECTED_COLUMNS = [
    "property_id",
    "city",
    "property_type",
    "locality",
    "area_sqft",
    "area_basis",
    "bedrooms",
    "property_age",
    "price_inr",
    "price_type",
    "source_name",
    "source_url",
    "collected_date"
]

print("\n========== MODELWATCH DATASET VALIDATION ==========\n")

try:
    df = pd.read_csv(CSV_FILE, dtype=str, keep_default_na=False)

    # 1. Column validation
    print("1. Total columns:", len(df.columns))
    if list(df.columns) == EXPECTED_COLUMNS:
        print("   PASS: All 13 columns are correct.")
    else:
        print("   FAIL: Column names/order do not match.")
        print("   Found:", list(df.columns))

    # 2. Row count
    print("\n2. Total property records:", len(df))

    # 3. Duplicate property IDs
    duplicate_ids = df[df["property_id"].duplicated()]["property_id"].tolist()
    if not duplicate_ids:
        print("3. PASS: No duplicate property IDs.")
    else:
        print("3. FAIL: Duplicate IDs found:", duplicate_ids)

    # 4. Required fields
    required = [
        "property_id", "city", "property_type", "locality",
        "area_sqft", "area_basis", "price_inr",
        "price_type", "source_name", "source_url", "collected_date"
    ]

    missing = {
        column: df.index[df[column].str.strip() == ""].tolist()
        for column in required
        if (df[column].str.strip() == "").any()
    }

    if not missing:
        print("4. PASS: Required fields are filled.")
    else:
        print("4. FAIL: Empty required fields (CSV row numbers start at 2):")
        for column, indexes in missing.items():
            print(f"   {column}: {[i + 2 for i in indexes]}")

    # 5. Numeric area and price
    area = pd.to_numeric(df["area_sqft"], errors="coerce")
    price = pd.to_numeric(df["price_inr"], errors="coerce")

    if area.notna().all() and (area > 0).all():
        print("5. PASS: Area values are valid.")
    else:
        print("5. FAIL: Check area_sqft values.")

    if price.notna().all() and (price > 0).all():
        print("6. PASS: Price values are valid.")
    else:
        print("6. FAIL: Check price_inr values.")

    # 6. Source URL check
    invalid_urls = df[
        ~df["source_url"].str.startswith(("https://", "http://"))
    ]["property_id"].tolist()

    if not invalid_urls:
        print("7. PASS: All records have HTTP/HTTPS source URLs.")
    else:
        print("7. FAIL: Check URLs for:", invalid_urls)

    # 7. Summary
    print("\n========== DATASET SUMMARY ==========")
    print("\nCity-wise records:")
    print(df["city"].value_counts().to_string())

    print("\nProperty-type records:")
    print(df["property_type"].value_counts().to_string())

    print("\nValidation finished.")
    print("Remember: Technical validation does not verify listing accuracy.")

except FileNotFoundError:
    print("ERROR: property_prices.csv file not found.")
    print("Check that it is inside the datasets folder.")

except Exception as error:
    print("ERROR:", error)
