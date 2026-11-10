
import pandas as pd

# Load original dataset
df = pd.read_csv("datasets/property_prices.csv")

# Remove test and UI records
clean_df = df[
    ~df["source_name"].str.contains(
        "TestSource", case=False, na=False
    )
].copy()

# Remove example.com records
clean_df = clean_df[
    ~clean_df["source_url"].str.contains(
        "example.com", case=False, na=False
    )
].copy()

# Remove duplicate property IDs
clean_df = clean_df.drop_duplicates(
    subset=["property_id"]
)

# Save clean dataset
clean_df.to_csv(
    "datasets/property_prices_clean.csv",
    index=False
)

print("DATA CLEANING SUCCESSFUL!")
print("Original records:", len(df))
print("Clean records:", len(clean_df))

print("\nCity distribution:")
print(clean_df["city"].value_counts())

print("\nProperty distribution:")
print(clean_df["property_type"].value_counts())

print("\nSaved: datasets/property_prices_clean.csv")
