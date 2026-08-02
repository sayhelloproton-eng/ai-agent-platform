# Feishu Projection

Projection is `Git document bundle → Feishu document node` with overwrite semantics. The Publisher parses local Markdown images, validates bundle ownership, uploads the file, publishes text, inserts image/media blocks at stable headings and reads back content/revision.

Never store Feishu media tokens in Git. Never pre-read Feishu for semantic merge. A failed image upload or ambiguous insertion anchor fails the publication rather than silently dropping the visual.
