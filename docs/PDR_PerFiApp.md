# FinOS Module & Submodule Master Table

Prepared for sharing and editing.

## Summary
This document consolidates potential FinOS modules, submodules, competitor patterns, and differentiated opportunities.

---

# FinOS Expanded Module Table

## Rewards & Loyalty
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Rewards & Loyalty | Points Wallet | Central wallet showing all loyalty balances (cashback, airline, hotel, bank points) with cad-value estimates. | Mint (basic), issuer apps | Mint lets you see some reward balances but mostly focuses on spend; issuers show points but only for their own card ecosystem. [web:99][web:107][web:115] | Aggregate across Canadian and global programs and translate everything into CAD + time-to-goal context. |
| Rewards & Loyalty | Card Knowledgebase & Perks Vault | One canonical view of every card's earn rates, bonus categories, statement credits, travel perks, and insurance benefits. | CardPointers [web:116][web:120][web:124][web:126] | CardPointers maintains a large card database showing category bonuses, perks, credits, and rules. [web:116][web:120][web:124][web:126] | Build a Canada-first perks DB (bilingual) and tie each perk directly into budgeting, travel and insurance workflows. |
| Rewards & Loyalty | Best Card Recommender | Tell the user which card to use at a merchant or moment to maximize net value. | CardPointers, Honey, Mint [web:114][web:116][web:118][web:120][web:124][web:126][web:102][web:110][web:107] | CardPointers highlights the best card for each merchant or purchase type and has location-aware prompts. Honey chooses the best coupon at checkout. Mint suggests better cards in general. [web:114][web:116][web:118][web:120][web:124][web:126][web:102][web:110][web:107] | Go beyond "max points" by incorporating budget, cash flow, and utilization. |
| Rewards & Loyalty | Offer Auto-Activation & Sync | Automatically surface and activate card-linked offers so users don't miss bank offers. | CardPointers [web:116][web:120][web:124][web:122] | CardPointers syncs with Amex/Chase/BoA/Citi Offers and helps bulk-activate and track them. [web:116][web:120][web:124][web:122] | Ingest and normalize offers from Canadian banks and co-brands, then tie them to budget categories and shopping plans. |
| Rewards & Loyalty | Welcome Bonus & Minimum Spend Tracker | Track every card's welcome bonus requirements and deadlines. | CardPointers [web:116][web:118][web:120][web:124] | CardPointers stores each card's welcome offer, minimum spend requirement, and deadline and shows progress. [web:116][web:118][web:120][web:124] | Warn when bonus-chasing would push a user beyond healthy spend and offer alternate paths. |
| Rewards & Loyalty | Statement Credit & Perks Coach | Make sure users actually consume recurring credits before expiry. | CardPointers [web:116][web:118][web:120] | CardPointers shows remaining statement credits and their reset dates. [web:116][web:118][web:120] | Suggest concrete usage plans and flag chronically unused perks as downgrade/cancel candidates. |
| Rewards & Loyalty | Merchant Insights & Reward Mapping | Show which merchants drive most spend and which rewards/loyalty they're tied to. | Mint, Rocket Money, Honey [web:99][web:100][web:108][web:78][web:110] | Mint and Rocket Money show top merchants and recurring charges; Honey has merchant coverage and price history. [web:99][web:100][web:108][web:78][web:110] | Build a merchant graph that powers rewards, subscriptions, tax tagging, and shopping decisions. |
| Rewards & Loyalty | Deal Radar (Offers & Sales) | Central feed of relevant sales, card-linked offers, and point promos matched to the wallet. | CardPointers, Honey, Mint [web:116][web:120][web:124][web:122][web:102][web:78][web:107] | CardPointers consolidates bank offers and category bonuses; Honey tracks store deals and price drops. [web:116][web:120][web:124][web:102][web:78][web:107] | Only show deals that fit current budget and goals, and calculate real savings vs extra spending. |
| Rewards & Loyalty | Status Tracker | Track airline, hotel, and elite card status progress and how to reach or maintain tiers. | CardPointers [web:116][web:124] | CardPointers can store perks like elite status earnings/benefits. [web:116][web:124] | Provide a Canadian traveler-friendly status view tied to actual travel plans and budgets. |
| Rewards & Loyalty | Multi-Profile Rewards Manager | Coordinate card and rewards strategies across multiple people. | CardPointers [web:114][web:118][web:122] | CardPointers supports multiple profiles so users can manage offers and perks for different people. [web:114][web:118][web:122] | Tie into Household so each person knows which card to use and why. |

## Credit & Coaching
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Credit & Coaching | Credit Monitor | Track score and credit report factors. | Borrowell, Cleo, BON Credit [web:12][web:15][web:18][web:101][web:109][web:119] | Borrowell provides free Canadian credit scores and monitoring plus tips; Cleo gives credit-builder features; BON Credit positions itself as credit/money coach. [web:12][web:15][web:18][web:101][web:109][web:119] | Offer Canada-focused credit monitoring in the same place as card and rewards coaching. |
| Credit & Coaching | Due-Date & Utilization Coaching | Smart reminders and tactical suggestions to maintain on-time payments and healthy utilization. | BON Credit, Mint, Rocket Money, CardPointers [web:119][web:107][web:100][web:108][web:116] | BON Credit sends reminders before due dates; Mint and Rocket Money notify users about upcoming bills and low balances; CardPointers tracks card-anniversary dates and benefits resets. [web:119][web:107][web:100][web:108][web:116] | Suggest paying cards early to reduce utilization and re-route spend to avoid thresholds. |
| Credit & Coaching | Credit Builder Actions | Playbook for secured cards, utilization tactics, and payment history. | Cleo, Borrowell, BON Credit [web:101][web:109][web:12][web:18][web:119] | Cleo offers credit-builder features; Borrowell's Rent Advantage reports rent to Equifax; BON Credit coaches on credit choices. [web:101][web:109][web:12][web:18][web:119] | Make the builder plan dynamic and Canada-specific. |
| Credit & Coaching | Refinance & Card Lineup Optimization | Identify when to refinance or adjust card lineup based on real usage and value. | BON Credit, CardPointers [web:119][web:116][web:120][web:124] | BON Credit catches refinancing opportunities; CardPointers calculates card value by tracking annual fees, perks, and real usage. [web:119][web:116][web:120][web:124] | Show the long-term impact on rewards and credit score for keep/downgrade/cancel decisions. |

## Cash Safety & Autopilot
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Cash Safety & Autopilot | Low-Balance & Fee Guard | Predict when accounts will be too low to safely pay upcoming statements and fees. | Mint, Rocket Money, Cleo, BON Credit [web:107][web:100][web:108][web:101][web:109][web:119] | Mint alerts low funds before bills; Rocket Money shows upcoming bills; Cleo and BON provide reminder-style coaching. [web:107][web:100][web:108][web:101][web:109][web:119] | Provide a forward-looking runway chart with protective micro-actions to keep the runway safe. |
| Cash Safety & Autopilot | ~~Cash Advance Lite~~ **(DROPPED — out of scope)** | Competitive context retained for the record; FinOS does **not** originate, broker, or refer cash advances (Constitution Principle IV). | Cleo [web:101][web:109][web:75] | Cleo offers up to $250 cash advance with no interest and no credit check. [web:101][web:109][web:75] | Not pursued — Cash Safety stays purely predictive (runway + micro-actions). |
| Cash Safety & Autopilot | Rules-Based Sweeps & Roundups | Auto-move small amounts when conditions are met. | Moka, Cleo, KOHO [web:52][web:58][web:61][web:101][web:109][web:68][web:76] | Moka rounds up purchases and invests spare change; Cleo and KOHO provide autosave rules and roundups. [web:52][web:58][web:61][web:101][web:109][web:68][web:76] | Route to debt, TFSA, or savings based on the user's plan. |

## Bills & Subscriptions
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Bills & Subscriptions | Subscription Radar | Surface all recurring charges in one dashboard. | Rocket Money, Mint [web:99][web:100][web:107][web:108] | Rocket Money automatically detects recurring charges and highlights forgotten subscriptions; Mint detects recurring bills and sends reminders. [web:99][web:100][web:107][web:108] | Categorize subs into essential, negotiable, nice-to-have and show shared-budget impact. |
| Bills & Subscriptions | One-Tap Cancellation & Negotiation | Cancel or renegotiate bills without support hell. | Rocket Money [web:100][web:108] | Offers premium concierge to cancel subs and negotiate better rates. [web:100][web:108] | Show savings if canceled/renegotiated and downstream effect on goals. |
| Bills & Subscriptions | Free-Trial Guard | Track free trials and warn before they auto-convert. | Rocket Money, Honey [web:100][web:108][web:102][web:110] | Rocket Money surfaces new recurring charges; Honey is shopping-focused. [web:100][web:108][web:102][web:110] | Treat trials as first-class objects with countdowns and one-tap keep/cancel. |
| Bills & Subscriptions | Bill Calendar & Alerts | Show all due dates on a calendar and alert users before they miss a payment. | Mint, Rocket Money, Splitwise [web:107][web:100][web:108][web:16][web:111] | Mint lets users add recurring bills with due dates and reminders; Splitwise supports recurring expenses with reminders; Rocket Money shows upcoming bills. [web:107][web:16][web:111][web:100][web:108] | Combine calendar with predicted safe days to pay and move/renegotiate bills. |

## Pay & Payment Optimization
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Pay & Payment Optimization | Best Card / Account to Use | Tell users which card/account to use at checkout. | CardPointers, Honey, Mint [web:114][web:116][web:118][web:120][web:124][web:126][web:102][web:110][web:107] | CardPointers highlights the best card for each merchant and supports location-aware prompts; Honey chooses the best coupon; Mint suggests better cards. [web:114][web:116][web:118][web:120][web:124][web:126][web:102][web:110][web:107] | Incorporate budget, cash flow, and utilization so the recommendation is financially safe. |
| Pay & Payment Optimization | Payment Sequencer | Sequence payments to avoid overdrafts and maximize progress. | Rocket Money [web:100][web:108] | Rocket Money shows upcoming bills and budgets but doesn't deeply orchestrate pay order. [web:100][web:108] | Suggest an optimal payment schedule and update the calendar automatically. |

## Shopping & Deals
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Shopping & Deals | Auto-Coupons & Codes | Automatically apply coupon codes at checkout. | Honey [web:73][web:78][web:82][web:110] | Honey auto-tests coupon codes and applies the best one. [web:73][web:78][web:82][web:110] | Integrate coupon logic with budgets and goals. |
| Shopping & Deals | Price Watch & Droplist | Track product prices and alert when they drop. | Honey [web:102][web:110][web:73][web:78] | Honey lets users watch items and notifies them when prices drop. [web:102][web:110][web:73][web:78] | Attach each watched item to target budgets and cash-flow calendars. |
| Shopping & Deals | Buy Now vs Wait Score | Blend price intel, budget state, and upcoming obligations into a purchase score. | Mint, Honey [web:107][web:102][web:110] | Mint flags overspending; Honey tracks price but ignores user financial context. [web:107][web:102][web:110] | Show the best date to buy and the impact on goals. |

## Tasks & To-Dos
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Tasks & To-Dos | Money-Aware Tasks | Turn financial concerns into tasks linked to relevant data. | Todoist, Mint [web:84][web:90][web:96][web:107] | Todoist manages tasks with due dates, priorities, labels and recurring schedules; Mint sets bill reminders. [web:84][web:90][web:96][web:107] | Attach tasks to bills, merchants, budgets, or goals so completion updates status. |
| Tasks & To-Dos | Smart Scheduling | Suggest the best day/time to tackle life admin. | Todoist [web:90][web:96] | Todoist analyzes upcoming tasks and suggests an even distribution across days. [web:90][web:96] | Factor in paydays and bill dates. |

## Habits & Routines
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Habits & Routines | Gamified Habits & Dailies | Track small recurring actions and reward consistency. | Habitica [web:86][web:92][web:98] | Treats life as a game with habits, daily tasks, quests, XP, and social accountability. [web:86][web:92][web:98] | Tie XP and streaks to real progress and let users opt into the game layer. |
| Habits & Routines | Cross-Module Rituals | Bundle micro-actions into a daily check-in. | Habitica, Headspace [web:86][web:95][web:98] | Habitica bundles recurring tasks; Headspace encourages daily practice. [web:86][web:95][web:98] | Launch a short ritual: review bills, approve roundups, clear notifications. |

## Focus & Mental Health
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Focus & Mental Health | Money Stress Packs | Offer short structured sessions for bill/debt anxiety. | Headspace [web:89][web:95][web:105] | Headspace provides themed packs for stress, anxiety, sleep, etc. [web:95][web:105] | Provide money-specific packs with both emotional support and concrete actions. |
| Focus & Mental Health | Sleep & Wind-Down | Evening sequences that turn worries into tasks, then guide wind-down. | Headspace [web:89][web:95] | Offers wind-down meditations and sleepcasts. [web:89][web:95] | Convert money worries into tasks/goals before a guided wind-down. |

## Inbox & Notifications
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Inbox & Notifications | Email Subscription Clean-Up | Detect promotional/newsletter emails and let users mass-unsubscribe or roll up. | Unroll.me [web:87][web:93] | Scans inbox for subscription messages and lets users Block, Rollup or Keep, then sends a daily digest. [web:87][web:93] | Prioritize unsubscribes from senders that trigger impulse spending. |
| Inbox & Notifications | Unified Money Digest | Bundle all money-related alerts into one or two daily digests. | Unroll.me, Mint [web:87][web:93][web:99][web:107] | Unroll.me aggregates senders into a digest; Mint sends various money alerts. [web:87][web:93][web:99][web:107] | Single FR/EN digest where each section is actionable. |

## Travel & Trips
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Travel & Trips | Automatic Itinerary Builder | Auto-build travel itineraries by parsing confirmation emails. | TripIt [web:94][web:88] | Users forward confirmations and TripIt builds an itinerary with flights, hotels, cars, and calendar sync. [web:94] | Make the itinerary aware of travel budget, FX, and insurance. |
| Travel & Trips | Travel Stats & Carbon | Show travel stats and optional carbon footprint. | TripIt [web:88][web:106] | Provides travel stats and carbon estimates for flights. [web:88][web:106] | Add lifetime travel spend and cost-per-trip/day. |

## Life Admin & Docs
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Life Admin & Docs | Receipt & Warranty Vault | Store, tag, and search receipts/warranties for easy returns or claims. | Splitwise Pro, TripIt [web:79][web:94] | Splitwise Pro stores receipts; TripIt lets users upload documents. [web:79][web:94] | Auto-link receipts to transactions and warranties to big-ticket items. |
| Life Admin & Docs | Important Document Wallet | Centralize critical documents with reminders. | TripIt, Notion [web:94][web:85] | TripIt stores docs with trips; Notion provides flexible pages and databases. [web:94][web:85] | Provide a structured financial vault with export and sharing controls. |

## Workspace & Playbooks
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Workspace & Playbooks | Life Event Playbooks | Pre-built workspaces for moves, job changes, baby, immigration, etc. | Notion [web:85][web:91][web:97] | Notion offers templates and database templates for projects and workflows. [web:85][web:91][web:97] | Wire playbooks to actual data and Canada-specific checklists. |
| Workspace & Playbooks | Personal Finance Notebook | A Notion-style notes + database area that syncs with FinOS data. | Notion, Mint [web:85][web:97][web:99] | Notion provides flexible databases; Mint offers limited notes. [web:85][web:97][web:99] | Provide templates that auto-reference FinOS numbers without copy-paste. |

## Household & Family
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Household & Family | Family Dashboard & Roles | A household-level view with roles and permissions. | Wealthica Family Office, YNAB, Monarch [web:69][web:103][web:104] | Wealthica offers family dashboards; YNAB supports household sharing; Monarch gives shared dashboards for couples. [web:69][web:103][web:104] | Offer fine-grained visibility per module and bilingual labels. |
| Household & Family | Kid Money & Allowances | Manage allowances, kid spending cards, and simple goals. | KOHO, Habitica [web:68][web:76][web:98] | KOHO's prepaid card + app can be used for controlled spending; Habitica is gamified. [web:68][web:76][web:98] | Parent dashboards with chore-based allowances and kid-friendly goal trackers. |

## Social & Accountability
| Module (Tab) | Submodule | Description (pet peeve / problem solved) | Competitor(s) Doing Something Similar | What Competitors Actually Do (main big features) | Potential FinOS Edge |
|---|---|---|---|---|---|
| Social & Accountability | Accountability Circles | Small groups that share progress on specific challenges. | Habitica [web:86][web:98][web:92] | Habitica parties share quests and progress, providing social accountability for shared goals. | Tie circles to real budget/goal progress with bilingual, privacy-controlled sharing. |

<!-- NOTE: The source PDR was truncated mid-sentence in the final row above ("Habitica parties share ..."). The last two cells have been completed to keep the table valid; revise from the authoritative source when available. -->
 