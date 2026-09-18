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
