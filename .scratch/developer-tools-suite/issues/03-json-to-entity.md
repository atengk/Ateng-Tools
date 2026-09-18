# 03 — JSON to Entity Converter

**What to build:** A client-side JSON to typed model generator. Users paste arbitrary JSON data to produce Java DTO/POJO classes (with Lombok `@Data`, `@Builder`, Jackson `@JsonProperty`, nested static inner classes, and camelCase conversion) as well as TypeScript `interface` definitions. Configurable options allow setting Root Class Name, Package Name, and toggling annotations.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Recursive type inference supporting primitives, objects, and arrays.
- [x] Special type heuristics: ISO-8601 date strings inferred as `LocalDateTime`, large integers inferred as `Long`, floats inferred as `Double`/`BigDecimal`.
- [x] Automatic snake_case to camelCase field renaming with `@JsonProperty("original_key")` preserved.
- [x] Nested objects emitted as clean static inner classes or separate classes.
- [x] TypeScript interface emission with optional fields and nested sub-interfaces.
- [x] UI with split-pane code editors, formatting controls, and one-click copy buttons.
- [x] Unit tests in `json-to-entity.service.test.ts` pass and cover nested objects, arrays, date inference, nulls, and naming transformations.
- [x] Tool registration and route `/json-to-entity`.
