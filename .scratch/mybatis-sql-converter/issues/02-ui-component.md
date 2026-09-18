# 02 — UI Component and Prettify Integration

**What to build:**
A responsive Vue 3 interactive tool interface using Naive UI and UnoCSS. The left panel allows developers to paste logs, load a realistic MyBatis log sample, and clear input. The right panel includes a toolbar with a SQL Prettify toggle, dialect selector (MySQL, PostgreSQL, Oracle, etc.), boolean output format selector (`1/0` vs `TRUE/FALSE`), followed by rendered Restored SQL cards. Developers can copy the entire batch of restored SQL with a single click or copy individual statements. Any parameter mismatch warnings are visually highlighted.

**Blocked by:** 01 — Core Parser and Restoration Engine

**Status:** resolved

- [x] Responsive two-column split layout (stacked on small mobile screens)
- [x] Multiline input textarea with "Load Sample" and "Clear" helper actions
- [x] Integration with sql-formatter supporting toggling prettification on/off and dialect selection
- [x] Boolean format selector (`1/0` vs `TRUE/FALSE`) updating restored output in real time
- [x] "Copy All" action combining all restored SQL statements with semicolons
- [x] Individual statement cards with per-statement copy buttons and parameter count mismatch warning badges
