# Scorch City — Content Bible v1

This document defines the content architecture for the survival-world redesign. It separates world truth, NPC knowledge, and player knowledge so that undiscovered systems, locations, people, mechanics, clues, and endings cannot leak into the UI.

## 1. Knowledge layers

Every content record MUST declare who actually knows it. UI is always rendered from player knowledge, never directly from world truth.

- `world_truth`: canonical simulation state. May contain people, locations, stock, events, infrastructure, hidden causes and future possibilities the player does not know.
- `npc_knowledge`: per-NPC beliefs. A belief may be true, false, incomplete, outdated, or hearsay.
- `player_knowledge`: facts, observations, rumors, clues and relationships the player has actually acquired.

Unknown content is absent. Do not render `?`, `0`, `未取得`, `0/10`, category tabs, empty frameworks, disabled actions, or names for undiscovered concepts.

## 2. Content record families

### Item
Required fields:
- `id`
- `name`
- `category_internal`
- `weight_kg`
- `stack_rule`
- `heat_class`
- `uses`
- `discovery_tags`
- `source_ids`
- `finite_stock`

Player-facing category names must not be inferred from `category_internal` before discovery.

### NPC
Required fields:
- `id`
- `name`
- `origin`
- `profession`
- `traits`
- `needs`
- `goals`
- `fears`
- `inventory`
- `knowledge_ids`
- `relationship_edges`
- `trust_model`
- `travel_policy`
- `survival_policy`
- `trade_policy`
- `conversation_topics`
- `event_hooks`

NPCs own their survival state. The player gives high-level instructions; the NPC controller decides routine drinking, eating, resting, retreating, and refusal.

### Intelligence
General world knowledge that is not necessarily endgame-related.

Required fields:
- `id`
- `claim`
- `source_type`
- `source_id`
- `reliability`
- `observed_at`
- `expires_or_stales`
- `verification_state`
- `reveals`

### Clue
A concrete piece of evidence that can contribute to one or more higher-order deductions.

Required fields:
- `id`
- `evidence`
- `source_id`
- `required_observation`
- `deduction_links`
- `reveals`

There is no player-facing total clue count.

### Deduction
A conclusion that becomes available only after sufficient evidence is known.

Required fields:
- `id`
- `statement`
- `required_clue_sets`
- `optional_support`
- `unlocks`
- `confidence_rule`

### Event
Required fields:
- `id`
- `scope`
- `trigger`
- `participants`
- `preconditions`
- `effects`
- `player_visibility_rule`
- `followups`
- `repeatable: false` by default

Events may occur without the player. Unknown deaths and off-screen events do not automatically notify the player.

### Conversation topic
Required fields:
- `id`
- `npc_id`
- `topic_key`
- `availability`
- `player_prompt`
- `npc_response_variants`
- `knowledge_effects`
- `relationship_effects`
- `trade_or_companion_effects`

Topics are knowledge-gated. The player cannot ask about concepts they have never encountered unless the NPC introduces them first.

### Relationship edge
Required fields:
- `from_npc`
- `to_npc`
- `known_to_player`
- `affinity`
- `trust`
- `obligation`
- `conflict`
- `history`

### Trade offer
Required fields:
- `id`
- `owner_id`
- `offered_assets`
- `requested_assets_or_conditions`
- `location_id`
- `escrow_state`
- `expires`
- `visibility_rule`

All trades conserve physical stock. Posted goods leave the seller inventory and enter physical escrow.

### Companion state
Required fields:
- `npc_id`
- `mode`
- `current_order`
- `temperature`
- `injury`
- `fatigue`
- `water`
- `food`
- `carried_weight`
- `morale`
- `risk_tolerance`
- `autonomy_policy`

### Ending route
Ending routes exist in world truth but have no UI framework until the player forms the prerequisite deductions.

Required fields:
- `id`
- `hidden_name`
- `required_deductions`
- `required_people_or_skills`
- `required_assets`
- `required_world_state`
- `execution_steps`
- `failure_modes`
- `resolution`

No ending route is tied to Day 60.

## 3. First complete-content target

Target scale for the first content-complete version:

| Family | Target |
| --- | ---: |
| Items | 100 |
| Fully authored NPCs | 30 |
| Conversation topics | 300 |
| World events | 75 |
| Intelligence records | 100 |
| Core clues | 25 |
| Major deductions | 8 |
| Ending routes | 4 |

These are production targets, not player-visible counts.

## 4. Content allocation

### Items — 100 target
- Water and containers: 10
- Food: 16
- Medical: 12
- Batteries and small power: 10
- Tools: 14
- Parts and materials: 16
- Heat protection and cooling: 10
- Documents, keys and special objects: 12

### NPCs — 30 target
- Core / deep companion-capable: 10
- Mid-depth recurring NPCs: 12
- Local / short-chain NPCs: 8

### Events — 75 target
- Micro/local: 36
- Mid-scale social/logistical: 27
- Major world-state: 12

### Intelligence — 100 target
- Location / route: 24
- Resource / stock: 20
- Person / social: 20
- Hazard / infrastructure: 20
- Historical / causal: 16

### Clues — 25 target
Clues are distributed across locations, people, documents, physical evidence, equipment behavior, and witnessed events. No single content channel can expose an entire ending route.

### Deductions — 8 target
Each deduction requires multiple possible clue combinations so the player is not forced through one exact script.

### Ending routes — 4 target
Four distinct long-term resolutions. Their exact identities remain hidden until authored and discovered in-world. They must be caused by player action, not elapsed day count.

## 5. Dependency rules

1. Exploration discovers observations, not database categories.
2. Observations may create intelligence records.
3. Intelligence may unlock conversation topics, locations or verification actions.
4. Concrete evidence creates clues.
5. Sufficient clue combinations create deductions.
6. Deductions can reveal that a long-term project is possible.
7. NPC relationships determine who will share knowledge, trade, travel, work or refuse.
8. Physical items, people and facilities are required to execute projects.
9. Ending routes become actionable only after the player has acquired the necessary knowledge and material capability.
10. Survival may continue indefinitely if no ending is triggered.

## 6. UI existence rules

- No known people: no people/social framework.
- No intelligence: no intelligence framework.
- No clue: no clue framework.
- No deduction: no deduction framework.
- No discovered trade station: no world-market framework.
- No discovered mechanic: no category/filter/button naming that mechanic.
- No companion: no party/companion HUD.
- No actionable ending knowledge: no ending/progress framework.

Once a framework legitimately exists, it shows only known records, never hidden totals.

## 7. Batch-1 acceptance criteria

Batch 1 is complete when:
- the content families and knowledge boundaries above are canonical;
- target content quantities are recorded but remain non-player-facing;
- NPC autonomy ownership is defined;
- trade conservation and escrow rules are defined;
- ending routes are explicitly knowledge-gated and non-Day-60-based;
- later implementation batches can consume these records without reading world truth directly into UI.
