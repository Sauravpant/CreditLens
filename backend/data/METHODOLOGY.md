# Data Methodology

CreditLens trains on synthetic data, because no public applicant-level loan dataset exists for Nepal. [`generate.py`](generate.py) builds 5,000 loan applicants (seed 42, fully deterministic). Wherever Nepal Rastra Bank (NRB) publishes a figure, the distribution is anchored to it. Everything else is an explicit, documented assumption. All NRB figures, with their source URLs and access date (2026-11-27), are in [`nrb_references.json`](nrb_references.json).

## Figures anchored to NRB data

| What | NRB figure | How it is used |
|---|---|---|
| Province mix | Loans by province, mid-July 2025: Bagmati 59.5%, Koshi 11.0%, Lumbini 10.3%, Madhes 8.9%, Gandaki 6.4%, Sudurpashchim 2.8%, Karnali 1.1% | Applicants are sampled from these weights. `generate.py` reads them directly from the JSON. |
| Agriculture risk | Agriculture is 6.44% of lending but holds 23.5% of NPLs, so it has about 3.6x the bad loans its lending share would predict | Agriculture workers and agriculture loans together add about 1.2 to the default log-odds, about 3.3x the odds. |
| Overall credit quality | Commercial bank NPL ratio: 4.44% (FY 2024/25), about 5.4% (FY 2025/26) | Used as a lower bound for the target default rate (see assumptions). |
| Interest rates | Weighted average lending rate: 8.55% (Feb 2025) down to 6.64% (Jun 2026) | The weighted average is dominated by large corporate loans. Retail and unsecured loans carry a premium, so applicant rates run from 8% to 18%. |
| Consumer lending | Consumable loans are the largest category, 19.36% of lending | Personal loans are 20% of purposes. |

## Assumptions (not from NRB)

- **Default rate 10%.** The NPL ratio is the stock of bad loans in the whole loan book, corporate included. It is not an applicant-level default rate, and retail borrowers default more often. 10% sits about twice the NPL ratio and leaves enough defaults to train on. The generator calibrates the intercept to hit it exactly in expectation.
- **Gender 60/40 M/F.** This reflects the male skew of formal borrowing in Nepal. It does not affect default risk, so the model should learn that gender carries no signal.
- **Employment mix:** Private 35%, Self-employed 30%, Agriculture 20%, Government 15%. Agriculture employs most of Nepal's workforce, but formal borrowers skew urban, hence the lower share.
- **Income:** Log-normal with a median of about NPR 30,000/month, scaled by employment type (Government 1.3x, Agriculture 0.65x).
- **Loan size and term by purpose:**

  | Purpose | Loan size (multiple of monthly income) | Term |
  |---|---|---|
  | Personal, Agriculture | 1–10x | 3 years |
  | Education | 2–15x | 5 years |
  | Business | 3–25x | 5 years |
  | Housing | 10–40x | 15 years |

  PROJECT.md's 1–10x for every purpose would give unrealistically small housing loans.
- **Collateral probability by purpose:** Housing 90%, Business 70%, Agriculture 50%, Education 30%, Personal 20%.
- **Existing loans:** Poisson(0.8), capped at 4. Each one costs 8% of monthly income.

## How default is generated

1. **Debt-to-income (DTI)** is computed, not sampled: (existing loans × 8% of income + EMI of the new loan) ÷ income. Because it is a fixed formula of the 12 applicant fields, `model/predict.py` recomputes it with the same `debt_to_income()` function.
2. **Default log-odds** sum these effects:
   - High DTI, low income, missing collateral, agriculture, short credit history and high interest rate raise risk.
   - Government employment lowers risk.
3. **The intercept** is found by bisection, so that the mean default probability equals 10%.
4. **Each applicant's default flag** is drawn as a Bernoulli trial on that probability. Because of this randomness the model cannot reach perfect accuracy, as with real data.

`generate.py` ends with `sanity_check()`, which asserts every correlation PROJECT.md requires:
- Government employees default less than average, and agriculture workers more.
- Agriculture loans have the highest default rate of any purpose.
- Collateral, low DTI and long credit history all reduce defaults.

## Resulting default rates (seed 42)

| Employment | Default rate | Loan purpose | Default rate |
|---|---|---|---|
| Government | 2.8% | Housing | 4.3% |
| Private | 6.9% | Education | 5.8% |
| Self-employed | 10.9% | Business | 9.2% |
| Agriculture | 17.0% | Personal | 10.4% |
| | | Agriculture | 16.3% |

The overall default rate is 9.5%.

## Limitations

- The correlations are designed, not learned from real loans. Model metrics measure how well the model recovers the generator's rules, not real-world predictive power.
- Province carries no direct risk effect. NRB does not publish NPL ratios by province.
- Some press figures differ slightly from one another (see `nrb_references.json` caveats). The official NRB tables are the final authority.
