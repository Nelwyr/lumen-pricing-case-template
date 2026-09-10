"""Prepare privacy-safe, application-ready extracts from the case data.

The customer extract deliberately excludes respondent IDs, names, and e-mail
addresses. It contains only metrics aggregated at the segment-by-city level.
"""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "app_data"

CUSTOMER_INPUT = DATA_DIR / "customer_survey.csv"
SALES_INPUT = DATA_DIR / "historical_sales_weekly.csv"
CHANNEL_ECONOMICS_INPUT = DATA_DIR / "channel_economics.csv"
PRICE_TEST_INPUT = DATA_DIR / "price_test_results.csv"
MARKETING_FUNNEL_INPUT = DATA_DIR / "marketing_funnel_monthly.csv"
CUSTOMER_OUTPUT = OUTPUT_DIR / "customer_segment_city_aggregates.csv"
CITY_OUTPUT = OUTPUT_DIR / "customer_city_aggregates.csv"
SALES_OUTPUT = OUTPUT_DIR / "historical_sales_weekly_deduplicated.csv"
SIMULATOR_ASSUMPTIONS_OUTPUT = OUTPUT_DIR / "simulator_assumptions.json"

CHANNELS = ("DTC Online", "Retail/Grocery", "Gym & Office")
NUMERIC_FIELDS = (
    "age",
    "purchase_frequency_per_month",
    "monthly_beverage_spend_eur",
    "price_sensitivity_1_10",
    "lumen_purchase_intent_1_10",
)
AWARENESS_FIELDS = (
    "aware_pulsup",
    "aware_matelibre",
    "aware_voltfit",
    "aware_rootandrise",
)


def percentage(value: float) -> str:
    return f"{value:.1f}"


def is_true(value: str) -> bool:
    """Accept common CSV encodings for boolean survey fields."""
    return value.strip().lower() in {"1", "true", "yes"}


def sample_reliability(count: int) -> str:
    """Classify segment evidence according to the agreed sample-size rule."""
    if count >= 15:
        return "reliable"
    if count >= 8:
        return "directional_small_sample"
    return "insufficient"


def summarise_group(
    group: list[dict[str, str]], *, city: str, segment: str | None = None
) -> dict[str, str | int]:
    channel_counts = Counter(row["preferred_channel"] for row in group)
    result: dict[str, str | int] = {
        "city": city,
        "respondent_count": len(group),
        "sample_reliability": sample_reliability(len(group)),
        "most_preferred_channel": sorted(
            channel_counts, key=lambda channel: (-channel_counts[channel], channel)
        )[0],
    }
    if segment is not None:
        result["segment"] = segment
    for field in NUMERIC_FIELDS:
        result[f"avg_{field}"] = percentage(mean(float(row[field]) for row in group))
    for channel in CHANNELS:
        output_name = f"pct_prefer_{channel.lower().replace(' ', '_').replace('/', '_')}"
        result[output_name] = percentage(100 * channel_counts[channel] / len(group))
    for field in AWARENESS_FIELDS:
        result[f"pct_{field}"] = percentage(
            100 * sum(is_true(row[field]) for row in group) / len(group)
        )
    return result


def aggregate_customer_survey() -> int:
    with CUSTOMER_INPUT.open(encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))

    groups: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        groups[(row["segment"], row["city"])].append(row)

    metrics_fields = [
        "respondent_count",
        "sample_reliability",
        "avg_age",
        "avg_purchase_frequency_per_month",
        "avg_monthly_beverage_spend_eur",
        "avg_price_sensitivity_1_10",
        "avg_lumen_purchase_intent_1_10",
        "most_preferred_channel",
        *[f"pct_prefer_{channel.lower().replace(' ', '_').replace('/', '_')}" for channel in CHANNELS],
        *[f"pct_{field}" for field in AWARENESS_FIELDS],
    ]
    segment_output_fields = [
        "segment",
        "city",
        *metrics_fields,
    ]

    with CUSTOMER_OUTPUT.open("w", encoding="utf-8", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=segment_output_fields)
        writer.writeheader()
        for (segment, city), group in sorted(groups.items()):
            writer.writerow(summarise_group(group, segment=segment, city=city))

    city_groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        city_groups[row["city"]].append(row)
    with CITY_OUTPUT.open("w", encoding="utf-8", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=["city", *metrics_fields])
        writer.writeheader()
        for city, group in sorted(city_groups.items()):
            writer.writerow(summarise_group(group, city=city))

    return len(rows)


def deduplicate_sales() -> tuple[int, int]:
    with SALES_INPUT.open(encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        fieldnames = reader.fieldnames
        if fieldnames is None:
            raise ValueError("historical_sales_weekly.csv has no header row")
        rows = list(reader)

    seen: set[tuple[str, ...]] = set()
    unique_rows: list[dict[str, str]] = []
    for row in rows:
        row_key = tuple(row[field] for field in fieldnames)
        if row_key not in seen:
            seen.add(row_key)
            unique_rows.append(row)

    with SALES_OUTPUT.open("w", encoding="utf-8", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unique_rows)

    return len(rows), len(unique_rows)


def write_simulator_assumptions() -> None:
    """Export only the aggregated model inputs needed by the simulator engine."""
    with CHANNEL_ECONOMICS_INPUT.open(encoding="utf-8", newline="") as source:
        channel_rows = list(csv.DictReader(source))
    channel_economics: dict[str, dict[str, float]] = {}
    for row in channel_rows:
        channel_economics.setdefault(
            row["channel"],
            {
                "retailer_margin_pct": float(row["retailer_margin_pct"]),
                "distributor_cut_pct": float(row["distributor_cut_pct"]),
                "payment_processing_pct": float(row["payment_processing_pct"]),
                "fulfillment_cost_eur": float(row["fulfillment_cost_eur"]),
            },
        )

    with PRICE_TEST_INPUT.open(encoding="utf-8", newline="") as source:
        price_test_rows = list(csv.DictReader(source))
    acceptance_by_price: dict[float, list[float]] = defaultdict(list)
    for row in price_test_rows:
        acceptance_by_price[float(row["price_eur"])].append(
            float(row["estimated_acceptance_pct_of_survey"])
        )

    with MARKETING_FUNNEL_INPUT.open(encoding="utf-8", newline="") as source:
        funnel_rows = list(csv.DictReader(source))
    total_acquired = sum(float(row["conversions_customers_acquired"]) for row in funnel_rows)
    weighted_ltv = sum(
        float(row["ltv_estimate_eur"]) * float(row["conversions_customers_acquired"])
        for row in funnel_rows
    ) / total_acquired

    with CUSTOMER_INPUT.open(encoding="utf-8", newline="") as source:
        customer_rows = list(csv.DictReader(source))
    average_monthly_frequency = mean(
        float(row["purchase_frequency_per_month"]) for row in customer_rows
    )

    with (DATA_DIR / "cost_breakdown.csv").open(encoding="utf-8", newline="") as source:
        cost_rows = list(csv.DictReader(source))
    cogs = float(
        next(
            row["cost_per_unit_eur"]
            for row in cost_rows
            if row["cost_component"] == "TOTAL COGS per unit (330ml can)"
        )
    )

    assumptions = {
        "cogs_per_unit_eur": cogs,
        "channel_economics": channel_economics,
        "acceptance_curve": [
            {
                "price_eur": price,
                "acceptance_pct": mean(acceptances),
            }
            for price, acceptances in sorted(acceptance_by_price.items())
        ],
        "estimated_ltv_eur": weighted_ltv,
        "average_monthly_frequency": average_monthly_frequency,
        "target_ltv_cac_ratio": 3,
    }
    with SIMULATOR_ASSUMPTIONS_OUTPUT.open("w", encoding="utf-8") as destination:
        json.dump(assumptions, destination, indent=2)
        destination.write("\n")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    customer_rows = aggregate_customer_survey()
    sales_rows, unique_sales_rows = deduplicate_sales()
    write_simulator_assumptions()
    print(
        f"Aggregated {customer_rows} customer responses into "
        f"{CUSTOMER_OUTPUT.name} and {CITY_OUTPUT.name}."
    )
    print(
        f"Removed {sales_rows - unique_sales_rows} exact duplicate sales rows; "
        f"wrote {unique_sales_rows} rows to {SALES_OUTPUT.name}."
    )
    print(f"Wrote aggregate simulator assumptions to {SIMULATOR_ASSUMPTIONS_OUTPUT.name}.")


if __name__ == "__main__":
    main()
