# Ateng-Tools

Personal developer online toolbox providing client-side utility applications for formatting, encoding, generation, and data conversion.

## Language

### MyBatis SQL Converter

**MyBatis SQL Log Converter**:
A developer tool within Ateng-Tools that parses MyBatis/MyBatis-Plus runtime console logs, extracts SQL templates and bound parameters, and restores them into complete, executable SQL statements.
_Avoid_: SQL Runner, SQL Debugger, MyBatis Plugin

**Preparing Statement**:
The raw SQL string containing `?` parameter placeholders logged after the `Preparing:` marker in MyBatis console logs.
_Avoid_: Raw SQL, Prepared SQL, SQL Pattern

**Parameter Token**:
An individual bound parameter value logged after the `Parameters:` marker, containing a value and optional explicit type descriptor such as `value(Type)`.
_Avoid_: Argument, Variable, Bind Variable

**Restored SQL**:
The final executable SQL statement obtained by injecting typed and safely escaped Parameter Tokens into the `?` placeholders of a Preparing Statement.
_Avoid_: Merged SQL, Replaced SQL, Formatted Query

**Batch Log Entry**:
A distinct logical unit composed of one Preparing Statement and its corresponding Parameters line extracted from a mixed log stream.
_Avoid_: Statement Pair, Log Chunk, Query Block

### JSON to Entity Converter

**JSON to Entity Converter**:
A client-side tool that analyzes arbitrary JSON structures and generates typed models, supporting Java DTO/POJO (with Lombok and Jackson annotations), TypeScript interfaces, and Go structs.
_Avoid_: JSON to Java, JSON to Class, JSON Parser

**Target Model Definition**:
The generated code representation of an analyzed JSON object or array, including nested classes and type mappings.
_Avoid_: Output Class, Converted Schema, Target Entity

### cURL Converter

**cURL Converter**:
A client-side tool that parses standard cURL command syntax into structured HTTP request elements and converts them into native client code (Axios, Fetch, Java HttpClient/OkHttp).
_Avoid_: cURL Parser, HTTP Request Generator, Request Builder

**Parsed Request Spec**:
The intermediate structured representation of a cURL command, capturing method, URL, headers, query parameters, and request body.
_Avoid_: cURL Object, Request DTO, Extracted Request

### Snowflake ID Analyzer

**Snowflake ID Analyzer**:
A client-side tool that decomposes 64-bit distributed snowflake IDs into their composite bit segments (timestamp, datacenter ID, worker ID, and sequence number) and supports configurable reverse ID generation.
_Avoid_: Snowflake Calculator, Snowflake Inspector, ID Decoder

**Epoch Offset**:
The custom start timestamp (in milliseconds) used by a Snowflake algorithm implementation as the base zero point.
_Avoid_: Base Time, Epoch Start, Genesis Timestamp

### SQL DDL to Entity Converter

**SQL DDL to Entity Converter**:
A client-side tool that parses MySQL `CREATE TABLE` DDL statements and converts columns, primary keys, and comments into mapped Java Entity definitions with MyBatis-Plus and Lombok annotations.
_Avoid_: DDL Generator, Table to Entity, SQL to Code

**Column Mapping Rule**:
The deterministic logic converting SQL data types (e.g., `BIGINT`, `VARCHAR`, `DATETIME`) and constraints into corresponding target language types and annotations.
_Avoid_: Field Rule, Type Transformer, Schema Mapping
