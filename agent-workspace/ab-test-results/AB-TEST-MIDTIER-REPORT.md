# FoodClaw Mid-Tier Model A/B Test — Dietary Flags

**Date**: 2026-04-03
**Rounds**: 5 (all 50 dishes per round)
**Total evaluations per model**: 250 dishes × 7 flags = 1750 flag checks

## Results

| Metric | Claude Sonnet 4.6 (baseline) | DeepSeek R1 | Qwen Max |
|--------|--------|--------|--------|
| **Accuracy** | 100.0% | 98.9% | 90.2% |
| **Conservatism** | 0.0% | 79.8% | 58.5% |
| **Safety Failures** (total) | **0** | **9** | **53** |
| **False Negatives** (overcautious) | 0 | 1 | 34 |
| **Avg Latency** | 800ms | 12776ms | 1602ms |
| **Total Cost** (all rounds) | $1.0657 | $0.3289 | $0.1983 |
| **Cost per dish** | $0.0043 | $0.0013 | $0.0008 |
| **Monthly est.** (10K dishes) | $42.6300 | $13.1542 | $7.9312 |

### DeepSeek R1 — Safety Failures (9)

- Falafel Wrap: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Bibimbap: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Thai Green Curry: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Butter Chicken: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Chicken Tikka Masala: nut_free expected=null got=true (UNSAFE ASSUMPTION)

#### DeepSeek R1 — False Negatives (overcautious, 1)

- Mushroom Risotto: kosher expected=true got=false (OVERCAUTIOUS)

### Qwen Max — Safety Failures (53)

- Pad Thai: gluten_free expected=null got=true (UNSAFE ASSUMPTION)
- Vegetable Fried Rice: gluten_free expected=false got=true (FALSE POSITIVE)
- Pesto Pasta: dairy_free expected=false got=true (FALSE POSITIVE)
- Thai Green Curry: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Falafel Wrap: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Butter Chicken: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Sushi Platter: gluten_free expected=false got=true (FALSE POSITIVE)
- Chicken Tikka Masala: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Poke Bowl: gluten_free expected=false got=true (FALSE POSITIVE)
- Bibimbap: gluten_free expected=false got=true (FALSE POSITIVE)
- Bibimbap: nut_free expected=null got=true (UNSAFE ASSUMPTION)
- Fish Tacos: gluten_free expected=false got=true (FALSE POSITIVE)
- Lamb Gyro: dairy_free expected=false got=true (FALSE POSITIVE)

#### Qwen Max — False Negatives (overcautious, 34)

- Falafel Wrap: vegan expected=true got=false (OVERCAUTIOUS)
- Granola Parfait: kosher expected=true got=false (OVERCAUTIOUS)
- Caprese Salad: kosher expected=true got=false (OVERCAUTIOUS)
- Eggplant Parmesan: kosher expected=true got=false (OVERCAUTIOUS)
- Fettuccine Alfredo: kosher expected=true got=false (OVERCAUTIOUS)
- Shakshuka: vegetarian expected=true got=false (OVERCAUTIOUS)
- Shakshuka: kosher expected=true got=false (OVERCAUTIOUS)
- Mushroom Risotto: kosher expected=true got=false (OVERCAUTIOUS)
- Margherita Pizza: kosher expected=true got=false (OVERCAUTIOUS)
- Tres Leches Cake: halal expected=true got=false (OVERCAUTIOUS)

## Per-Round Breakdown

| Round | DeepSeek R1 Acc | Safety | Latency | Qwen Max Acc | Safety | Latency |
|-------|-------|-------|-------|-------|-------|-------|
| 1 | 98.1% | 1 | 12694ms | 89.5% | 11 | 1587ms |
| 2 | 100.0% | 0 | 12845ms | 89.9% | 11 | 1500ms |
| 3 | 99.6% | 1 | 13428ms | 90.3% | 11 | 1573ms |
| 4 | 97.4% | 5 | 11784ms | 90.5% | 9 | 1624ms |
| 5 | 99.2% | 2 | 13130ms | 91.1% | 11 | 1724ms |

## Verdict

### ❌ DeepSeek R1: 9 safety failures — NOT safe for production

### ❌ Qwen Max: 53 safety failures — NOT safe for production

