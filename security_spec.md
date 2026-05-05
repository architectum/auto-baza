# Security Spec

## Data Invariants
1. A Car must belong to the mechanic (ownerId).
2. A HistoryEntry must belong to a Car that belongs to the mechanic.

## The "Dirty Dozen" Payloads
1. Create Car with wrong ownerId
2. Create Car with missing required fields
3. Update Car changing ownerId
4. Shadow update Car with extra field
5. Create Car id with huge string
6. Read Car owned by someone else
7. Create History for someone else's car
8. Update History changing authorId
9. Create History with negative mileageDiff (well negative is possible if they made a mistake, let's just test basic missing fields)
10. Read History for someone else's car
11. Query Cars without filtering by ownerId
12. List queries without auth.

## Test Runner
Testing script validates these rules.
